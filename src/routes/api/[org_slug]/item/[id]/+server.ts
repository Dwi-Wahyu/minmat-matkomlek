import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	item,
	organization,
	stock,
	warehouse,
	equipment,
	movement,
	user,
	itemUnitConversion
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

	// Ambil data item utama
	const itemResults = await db.select().from(item).where(eq(item.id, params.id)).limit(1);

	if (itemResults.length === 0) {
		throw error(404, 'Item tidak ditemukan');
	}

	const itemData = itemResults[0];

	// Alias untuk join warehouse berganda
	const fromWh = alias(warehouse, 'from_warehouse');
	const toWh = alias(warehouse, 'to_warehouse');

	// Ambil data pendukung secara paralel untuk efisiensi
	const [stocksResults, equipmentsResults, movementsResults, unitConversions] = await Promise.all([
		// Stok di organisasi ini
		db
			.select({
				id: stock.id,
				qty: stock.qty,
				warehouse: warehouse
			})
			.from(stock)
			.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(and(eq(stock.itemId, params.id), eq(warehouse.organizationId, orgId))),

		// Peralatan di organisasi ini (jika ASSET)
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				brand: equipment.brand,
				condition: equipment.condition,
				status: equipment.status,
				warehouse: warehouse
			})
			.from(equipment)
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(and(eq(equipment.itemId, params.id), eq(equipment.organizationId, orgId))),

		// Riwayat pergerakan terakhir
		db
			.select({
				movement: movement,
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
			.where(and(eq(movement.itemId, params.id), eq(movement.organizationId, orgId)))
			.orderBy(desc(movement.createdAt))
			.limit(5),

		// Konversi satuan
		db.select().from(itemUnitConversion).where(eq(itemUnitConversion.itemId, params.id))
	]);

	// Format response
	const response = {
		...itemData,
		image: itemData.imagePath ? `/uploads/item/${itemData.imagePath}` : null,
		stocks: stocksResults,
		equipments: equipmentsResults.map((e) => ({
			...e,
			image: itemData.imagePath ? `/uploads/item/${itemData.imagePath}` : null
		})),
		movements: movementsResults.map((m) => ({
			...m.movement,
			fromWarehouse: m.fromWarehouse,
			toWarehouse: m.toWarehouse,
			pic: m.pic
		})),
		unitConversions: unitConversions
	};

	return json(response);
};
