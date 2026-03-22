import { db } from '$lib/server/db';
import { organization, equipment, item, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const filterType = url.searchParams.get('type') || 'ALL'; // ALL, ALKOMLEK, PERNIKA_LEK, CONSUMABLE

	// 1. Ambil detail organisasi
	const targetOrg = await db.query.organization.findFirst({
		where: eq(organization.id, id)
	});

	if (!targetOrg) throw error(404, 'Satuan tidak ditemukan');

	// 2. Query Inventaris
	// Kita akan mengambil Equipment (Aset) dan Stock (Consumable) yang dimiliki organisasi ini
	
	const filters = [];
	if (searchQuery) {
		filters.push(like(item.name, `%${searchQuery}%`));
	}

	// Ambil Equipment (Alat)
	const equipmentQuery = db
		.select({
			id: equipment.id,
			name: item.name,
			brand: equipment.brand,
			serialNumber: equipment.serialNumber,
			type: item.type,
			equipmentType: item.equipmentType,
			condition: equipment.condition,
			status: equipment.status,
			qty: sql<number>`1`,
			unit: item.baseUnit,
			warehouseName: warehouse.name
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
		.where(
			and(
				eq(equipment.organizationId, id),
				filterType === 'ALL' 
					? sql`1=1` 
					: filterType === 'CONSUMABLE' 
						? sql`1=0` 
						: eq(item.equipmentType, filterType as any),
				...filters
			)
		);

	// Ambil Stock (Barang Habis Pakai)
	const stockQuery = db
		.select({
			id: stock.id,
			name: item.name,
			brand: sql<string>`'-'`,
			serialNumber: sql<string>`'-'`,
			type: item.type,
			equipmentType: sql<string>`NULL`,
			condition: sql<string>`'BAIK'`,
			status: sql<string>`'READY'`,
			qty: stock.qty,
			unit: item.baseUnit,
			warehouseName: warehouse.name
		})
		.from(stock)
		.innerJoin(item, eq(stock.itemId, item.id))
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(
			and(
				eq(warehouse.organizationId, id),
				filterType === 'ALL' || filterType === 'CONSUMABLE' ? sql`1=1` : sql`1=0`,
				...filters
			)
		);

	const [equipments, stocks] = await Promise.all([equipmentQuery, stockQuery]);

	// Gabungkan hasil
	const inventory = [...equipments, ...stocks].sort((a, b) => a.name.localeCompare(b.name));

	return {
		targetOrg,
		inventory,
		filters: { q: searchQuery, type: filterType }
	};
};
