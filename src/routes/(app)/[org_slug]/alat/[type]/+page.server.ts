import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement } from '$lib/server/db/schema';
import { eq, and, like, sql, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
	const { org_slug, type } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Map URL type to database equipmentType
	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	const org = await db.query.organization.findFirst({
		where: eq(sql`slug`, org_slug)
	});

	if (!org) throw fail(404, { message: 'Organisasi tidak ditemukan' });

	const filters = [
		eq(item.equipmentType, equipmentType),
		eq(equipment.organizationId, org.id)
	];

	if (searchQuery) {
		filters.push(
			sql`(${like(equipment.serialNumber, `%${searchQuery}%`)} OR ${like(item.name, `%${searchQuery}%`)} OR ${like(equipment.brand, `%${searchQuery}%`)})`
		);
	}

	const [dataRaw, totalCountResult] = await Promise.all([
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
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

	// Fetch last movement for each
	const equipmentWithMovements = await Promise.all(
		dataRaw.map(async (eqp) => {
			const lastMov = await db.query.movement.findFirst({
				where: eq(movement.equipmentId, eqp.id),
				orderBy: [desc(movement.createdAt)]
			});
			return { ...eqp, lastMovement: lastMov };
		})
	);

	const totalItems = totalCountResult[0].count;

	return {
		equipment: equipmentWithMovements,
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
	}
};
