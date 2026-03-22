import { db } from '$lib/server/db';
import { item, stock, warehouse, movement } from '$lib/server/db/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	const organizationId = locals.user.organization.id;

	const searchQuery = url.searchParams.get('name') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Subquery to get warehouse IDs for this organization
	const organizationWarehouseIds = db
		.select({ id: warehouse.id })
		.from(warehouse)
		.where(eq(warehouse.organizationId, organizationId));

	const filters = [
		eq(item.type, 'CONSUMABLE'),
		inArray(
			item.id,
			db
				.select({ itemId: stock.itemId })
				.from(stock)
				.where(inArray(stock.warehouseId, organizationWarehouseIds))
		)
	];

	if (searchQuery) filters.push(like(item.name, `%${searchQuery}%`));

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(item)
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
			// Check if item is still used in stock before deleting
			const existingStock = await db.query.stock.findFirst({
				where: eq(stock.itemId, id)
			});

			if (existingStock && existingStock.qty > 0) {
				return fail(400, { message: 'Barang tidak bisa dihapus karena masih memiliki stok di gudang' });
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

		const qty = parseInt(qtyInput);

		try {
			await db.insert(movement).values({
				id: crypto.randomUUID(),
				itemId,
				organizationId: user.organization.id,
				eventType: type || 'ADJUSTMENT',
				qty,
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
