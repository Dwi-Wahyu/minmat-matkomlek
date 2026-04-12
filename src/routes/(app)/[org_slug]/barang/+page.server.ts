import { db } from '$lib/server/db';
import { item, stock, warehouse, movement, itemUnitConversion } from '$lib/server/db/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { deleteFile } from '$lib/server/storage';

export const load: PageServerLoad = async ({ url, locals }) => {
	const organizationId = locals.user.organization.id;

	const searchQuery = url.searchParams.get('name') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const stockAgg = db
		.select({
			itemId: stock.itemId,
			totalQty: sql<string>`SUM(${stock.qty})`.as('totalQty')
		})
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(eq(warehouse.organizationId, organizationId))
		.groupBy(stock.itemId)
		.as('sa');

	const filters = [eq(item.type, 'CONSUMABLE')];
	if (searchQuery) filters.push(like(item.name, `%${searchQuery}%`));

	const [itemsData, totalCountResult, warehouses] = await Promise.all([
		db
			.select({
				id: item.id,
				name: item.name,
				baseUnit: item.baseUnit,
				createdAt: item.createdAt,
				totalStock: stockAgg.totalQty
			})
			.from(item)
			.leftJoin(stockAgg, eq(item.id, stockAgg.itemId))
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(item.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(item)
			.where(and(...filters)),
		db.query.warehouse.findMany({
			where: eq(warehouse.organizationId, organizationId)
		})
	]);

	// Fetch conversions for the items on current page
	const itemIds = itemsData.map((i) => i.id);
	const conversions =
		itemIds.length > 0
			? await db.query.itemUnitConversion.findMany({
					where: inArray(itemUnitConversion.itemId, itemIds)
				})
			: [];

	// Map conversions to items
	const consumables = itemsData.map((item) => ({
		...item,
		conversions: conversions.filter((c) => c.itemId === item.id)
	}));

	return {
		consumables,
		warehouses,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalCountResult[0].count / limit),
			totalItems: totalCountResult[0].count
		},
		filters: { name: searchQuery }
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		try {
			// Get current item for image deletion
			const currentResult = await db.select().from(item).where(eq(item.id, id)).limit(1);

			if (currentResult.length === 0) return fail(404, { message: 'Barang tidak ditemukan' });
			const current = currentResult[0];

			// Check if item is still used in stock before deleting
			const existingStockResult = await db
				.select()
				.from(stock)
				.where(eq(stock.itemId, id))
				.limit(1);

			if (existingStockResult.length > 0 && Number(existingStockResult[0].qty) > 0) {
				return fail(400, {
					message: 'Barang tidak bisa dihapus karena masih memiliki stok di gudang'
				});
			}

			// Delete image if exists
			if (current.imagePath) {
				deleteFile(current.imagePath, 'item');
			}

			await db.delete(item).where(eq(item.id, id));
			return { success: true, message: 'Barang berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus barang' });
		}
	},

	mutate: async ({ request, locals }) => {
		const { user } = locals;
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const qtyInput = formData.get('qty') as string;
		const type = formData.get('type') as any;
		const notes = formData.get('notes') as string;
		const warehouseId = formData.get('warehouseId') as string;

		if (!itemId || !qtyInput || !warehouseId) {
			return fail(400, { message: 'Data mutasi tidak lengkap (pilih barang, jumlah, dan gudang)' });
		}

		try {
			const qtyNum = Number(qtyInput);
			const delta = type === 'ISSUE' ? -qtyNum : qtyNum;

			await db.transaction(async (tx) => {
				// 1. Record movement
				await tx.insert(movement).values({
					id: crypto.randomUUID(),
					itemId,
					organizationId: user.organization.id,
					eventType: type || 'ADJUSTMENT',
					qty: qtyNum.toString(),
					fromWarehouseId: type === 'ISSUE' || type === 'ADJUSTMENT' ? warehouseId : null,
					toWarehouseId: type === 'RECEIVE' || type === 'ADJUSTMENT' ? warehouseId : null,
					notes: notes || 'Mutasi stok manual',
					picId: user.id,
					createdAt: new Date()
				});

				// 2. Update or Insert Stock
				const existingStock = await tx.query.stock.findFirst({
					where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, warehouseId))
				});

				if (existingStock) {
					const newQty = Number(existingStock.qty) + delta;
					if (newQty < 0) throw new Error('Stok tidak mencukupi untuk pengeluaran ini');

					await tx
						.update(stock)
						.set({ qty: newQty.toFixed(4) })
						.where(eq(stock.id, existingStock.id));
				} else {
					if (delta < 0) throw new Error('Stok awal tidak bisa negatif');
					await tx.insert(stock).values({
						id: crypto.randomUUID(),
						itemId,
						warehouseId,
						qty: delta.toFixed(4)
					});
				}
			});

			return { success: true, message: 'Mutasi stok berhasil diperbarui' };
		} catch (error: any) {
			console.error('Error in mutate action:', error);
			return fail(500, { message: error.message || 'Gagal mencatat mutasi ke database' });
		}
	}
};
