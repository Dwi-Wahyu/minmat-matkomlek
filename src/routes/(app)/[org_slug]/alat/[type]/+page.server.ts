import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement } from '$lib/server/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { deleteFile } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params, url }) => {
	const { org_slug, type } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Map URL type to database equipmentType
	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	const filters = [
		eq(item.equipmentType, equipmentType),
		eq(equipment.organizationId, sql`(SELECT id FROM organization WHERE slug = ${org_slug})`)
	];

	if (searchQuery) {
		filters.push(
			sql`(${like(equipment.serialNumber, `%${searchQuery}%`)} OR ${like(item.name, `%${searchQuery}%`)} OR ${like(equipment.brand, `%${searchQuery}%`)})`
		);
	}

	const [data, totalCountResult] = await Promise.all([
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				brand: equipment.brand,
				condition: equipment.condition,
				status: equipment.status,
				itemName: item.name,
				imagePath: item.imagePath,
				warehouseName: warehouse.name,
				createdAt: equipment.createdAt
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(equipment.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(and(...filters))
	]);

	const totalItems = totalCountResult[0].count;

	return {
		equipment: data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		},
		filters: { q: searchQuery },
		type
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		try {
			await db.delete(equipment).where(eq(equipment.id, id));
			return { success: true, message: 'Alat berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus alat' });
		}
	},

	mutate: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const equipmentId = formData.get('equipmentId') as string;
		const classification = formData.get('classification') as any;
		const notes = formData.get('notes') as string;

		if (!equipmentId) return fail(400, { message: 'ID Alat tidak ditemukan' });

		try {
			await db.insert(movement).values({
				id: crypto.randomUUID(),
				equipmentId,
				organizationId: user.organization.id,
				eventType: 'ADJUSTMENT',
				classification: classification || null,
				qty: 1,
				notes: notes || 'Mutasi klasifikasi manual',
				picId: user.id,
				createdAt: new Date()
			});
			return { success: true, message: 'Mutasi alat berhasil dicatat' };
		} catch (error) {
			console.error('Error in mutate alat:', error);
			return fail(500, { message: 'Gagal mencatat mutasi alat ke database' });
		}
	}
};
