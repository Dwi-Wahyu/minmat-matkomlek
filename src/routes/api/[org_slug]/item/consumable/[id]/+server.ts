import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	item,
	organization,
	stock,
	warehouse,
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

	// Ambil data item utama (pastikan CONSUMABLE)
	const itemResults = await db
		.select()
		.from(item)
		.where(and(eq(item.id, params.id), eq(item.type, 'CONSUMABLE')))
		.limit(1);

	if (itemResults.length === 0) {
		throw error(404, 'Barang habis pakai tidak ditemukan');
	}

	const itemData = itemResults[0];

	// Alias untuk join warehouse berganda di riwayat movement
	const fromWh = alias(warehouse, 'from_warehouse');
	const toWh = alias(warehouse, 'to_warehouse');

	// Ambil data pendukung secara paralel
	const [stocksResults, movementsResults, unitConversions] = await Promise.all([
		// Stok di berbagai gudang dalam organisasi ini
		db
			.select({
				id: stock.id,
				qty: stock.qty,
				updatedAt: stock.updatedAt,
				warehouse: {
					id: warehouse.id,
					name: warehouse.name,
					location: warehouse.location
				}
			})
			.from(stock)
			.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(and(eq(stock.itemId, params.id), eq(warehouse.organizationId, orgId))),

		// Riwayat pergerakan (10 mutasi terakhir)
		db
			.select({
				id: movement.id,
				eventType: movement.eventType,
				qty: movement.qty,
				unit: movement.unit,
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
			.where(and(eq(movement.itemId, params.id), eq(movement.organizationId, orgId)))
			.orderBy(desc(movement.createdAt))
			.limit(10),

		// Aturan konversi satuan
		db
			.select({
				id: itemUnitConversion.id,
				fromUnit: itemUnitConversion.fromUnit,
				toUnit: itemUnitConversion.toUnit,
				multiplier: itemUnitConversion.multiplier
			})
			.from(itemUnitConversion)
			.where(eq(itemUnitConversion.itemId, params.id))
	]);

	// Format response
	const response = {
		...itemData,
		image: itemData.imagePath ? `/uploads/item/${itemData.imagePath}` : null,
		stocks: stocksResults,
		movements: movementsResults,
		unitConversions: unitConversions
	};

	return json({
		success: true,
		data: response
	});
};
