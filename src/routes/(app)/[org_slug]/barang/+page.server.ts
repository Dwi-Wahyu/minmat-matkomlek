import { db } from '$lib/server/db';
import { item, stock, warehouse, movement } from '$lib/server/db/schema';
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

	const [data, totalCountResult] = await Promise.all([
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
			.where(and(...filters))
	]);

	return {
		consumables: data,
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
			const existingStockResult = await db.select().from(stock).where(eq(stock.itemId, id)).limit(1);

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

		if (!itemId || !qtyInput) {
			return fail(400, { message: 'Data mutasi tidak lengkap' });
		}

		try {
			await db.insert(movement).values({
				id: crypto.randomUUID(),
				itemId,
				organizationId: user.organization.id,
				eventType: type || 'ADJUSTMENT',
				qty: qtyInput,
				notes: notes || 'Mutasi stok manual',
				picId: user.id,
				createdAt: new Date()
			});
			return { success: true, message: 'Mutasi stok berhasil dicatat' };
		} catch (error) {
			console.error('Error in mutate action:', error);
			return fail(500, { message: 'Gagal mencatat mutasi ke database' });
		}
	}
};
