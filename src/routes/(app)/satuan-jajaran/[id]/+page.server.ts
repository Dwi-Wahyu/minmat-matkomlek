import { db } from '$lib/server/db';
import { organization, equipment, item, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const { id } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const filterType = url.searchParams.get('type') || 'ALL'; // ALL, ALKOMLEK, PERNIKA_LEK, CONSUMABLE
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');

	const isSuperadmin = locals.user?.role === 'superadmin';

	// 1. Ambil detail organisasi
	const targetOrg = await db.query.organization.findFirst({
		where: eq(organization.id, id)
	});

	if (!targetOrg) throw error(404, 'Satuan tidak ditemukan');

	// 2. Query Inventaris
	// Kita akan mengambil Equipment (Aset) dan Stock (Consumable) yang dimiliki organisasi ini

	const filters: import('drizzle-orm').SQL[] = [];
	if (searchQuery) {
		filters.push(like(item.name, `%${searchQuery}%`));
	}

	// Deferred data fetching for skeleton loading
	const inventoryPromise = async () => {
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

		// Fix decimal formatting for stocks
		const formattedStocks = stocks.map((s) => ({
			...s,
			qty: Number(s.qty)
		}));

		// Gabungkan hasil dan urutkan
		const allInventory = [...equipments, ...formattedStocks].sort((a, b) =>
			a.name.localeCompare(b.name)
		);

		const totalItems = allInventory.length;
		const totalPages = Math.ceil(totalItems / limit) || 1;
		const paginatedItems = allInventory.slice((page - 1) * limit, page * limit);

		return {
			items: paginatedItems,
			pagination: { page, limit, totalPages, totalItems }
		};
	};

	return {
		targetOrg,
		isSuperadmin,
		filters: { q: searchQuery, type: filterType },
		lazy: {
			inventoryData: inventoryPromise()
		}
	};
};
