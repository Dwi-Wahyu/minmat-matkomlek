import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Use aliases for multiple joins to the same table if needed
	const toWarehouse = alias(warehouse, 'to_warehouse');

	// Use explicit select with joins to avoid LEFT JOIN LATERAL issues on some MySQL/MariaDB versions
	const results = await db
		.select({
			equipment: equipment,
			item: item,
			warehouse: warehouse,
			organization: organization
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.leftJoin(organization, eq(warehouse.organizationId, organization.id))
		.where(eq(equipment.id, id))
		.limit(1);

	if (results.length === 0) throw error(404, 'Alat tidak ditemukan');

	const row = results[0];
	const detail = {
		...row.equipment,
		item: row.item,
		warehouse: row.warehouse
			? {
					...row.warehouse,
					organization: row.organization
				}
			: null
	};

	// Ambil riwayat pergerakan terakhir menggunakan join eksplisit
	const historyResults = await db
		.select({
			movement: movement,
			organization: organization,
			fromWarehouse: warehouse,
			toWarehouse: toWarehouse
		})
		.from(movement)
		.leftJoin(organization, eq(movement.organizationId, organization.id))
		.leftJoin(warehouse, eq(movement.fromWarehouseId, warehouse.id))
		.leftJoin(toWarehouse, eq(movement.toWarehouseId, toWarehouse.id))
		.where(eq(movement.equipmentId, id))
		.orderBy(desc(movement.createdAt))
		.limit(5);

	const history = historyResults.map((h) => ({
		...h.movement,
		organization: h.organization,
		fromWarehouse: h.fromWarehouse,
		toWarehouse: h.toWarehouse
	}));

	return {
		equipment: detail,
		history
	};
};
