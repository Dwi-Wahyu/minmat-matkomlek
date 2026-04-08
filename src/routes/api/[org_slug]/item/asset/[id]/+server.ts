import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	equipment,
	item,
	warehouse,
	organization,
	movement,
	maintenance,
	user
} from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	// Validasi Auth
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug
	const orgResults = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, params.org_slug))
		.limit(1);

	if (orgResults.length === 0) {
		throw error(404, 'Organization not found');
	}

	const orgId = orgResults[0].id;

	// Ambil detail aset (equipment) beserta item dan warehouse
	const assetResults = await db
		.select({
			id: equipment.id,
			serialNumber: equipment.serialNumber,
			brand: equipment.brand,
			condition: equipment.condition,
			status: equipment.status,
			createdAt: equipment.createdAt,
			updatedAt: equipment.updatedAt,
			item: {
				id: item.id,
				name: item.name,
				type: item.type,
				equipmentType: item.equipmentType,
				baseUnit: item.baseUnit,
				description: item.description,
				imagePath: item.imagePath
			},
			warehouse: {
				id: warehouse.id,
				name: warehouse.name,
				location: warehouse.location
			}
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.where(and(eq(equipment.id, params.id), eq(equipment.organizationId, orgId)))
		.limit(1);

	if (assetResults.length === 0) {
		throw error(404, 'Aset tidak ditemukan');
	}

	const assetData = assetResults[0];

	// Alias untuk join warehouse berganda di riwayat movement
	const fromWh = alias(warehouse, 'from_warehouse');
	const toWh = alias(warehouse, 'to_warehouse');

	// Ambil data pendukung (movement & maintenance) secara paralel
	const [movementsResults, maintenanceResults] = await Promise.all([
		// Riwayat pergerakan aset ini
		db
			.select({
				id: movement.id,
				eventType: movement.eventType,
				qty: movement.qty,
				unit: movement.unit,
				classification: movement.classification,
				specificLocationName: movement.specificLocationName,
				notes: movement.notes,
				createdAt: movement.createdAt,
				fromWarehouse: fromWh,
				toWarehouse: toWh,
				pic: {
					id: user.id,
					name: user.name
				}
			})
			.from(movement)
			.leftJoin(fromWh, eq(movement.fromWarehouseId, fromWh.id))
			.leftJoin(toWh, eq(movement.toWarehouseId, toWh.id))
			.leftJoin(user, eq(movement.picId, user.id))
			.where(eq(movement.equipmentId, params.id))
			.orderBy(desc(movement.createdAt))
			.limit(10),

		// Riwayat pemeliharaan aset ini
		db
			.select({
				id: maintenance.id,
				maintenanceType: maintenance.maintenanceType,
				description: maintenance.description,
				scheduledDate: maintenance.scheduledDate,
				completionDate: maintenance.completionDate,
				status: maintenance.status,
				createdAt: maintenance.createdAt,
				technician: {
					id: user.id,
					name: user.name
				}
			})
			.from(maintenance)
			.leftJoin(user, eq(maintenance.technicianId, user.id))
			.where(eq(maintenance.equipmentId, params.id))
			.orderBy(desc(maintenance.createdAt))
			.limit(10)
	]);

	// Format response
	const response = {
		...assetData,
		image: assetData.item.imagePath ? `/uploads/item/${assetData.item.imagePath}` : null,
		movements: movementsResults,
		maintenances: maintenanceResults
	};

	return json({
		success: true,
		data: response
	});
};
