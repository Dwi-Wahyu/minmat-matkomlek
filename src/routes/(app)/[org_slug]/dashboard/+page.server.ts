import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { equipment, stock, movement, warehouse, item, lending, lendingItem } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.user.organization) {
		return {
			summary: { activeInventory: 0, warehouseStock: 0, damagedItems: 0, monthlyMovements: 0 },
			transito: { incoming: 0, outgoing: 0, pending: 0 },
			komoditi: { active: 0, outgoing: 0, damaged: 0 },
			balkir: { total: 0, used: 0, ready: 0, damaged: 0 },
			recentEquipments: []
		};
	}

	const orgId = locals.user.organization.id;

	// Periode Bulan Ini
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// 1. Ringkasan Stats (Top Cards)
	const [activeInventoryCount] = await db
		.select({ count: count() })
		.from(equipment)
		.where(eq(equipment.organizationId, orgId));

	const [warehouseStockSum] = await db
		.select({ total: sum(stock.qty) })
		.from(stock)
		.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
		.where(eq(warehouse.organizationId, orgId));

	const [damagedItemsCount] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				sql`${equipment.condition} != 'BAIK'`
			)
		);

	const [monthlyMovementsCount] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	// 2. Transito Stats
	const [transitoIncoming] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'TRANSITO'),
				eq(movement.eventType, 'RECEIVE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	const [transitoOutgoing] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'TRANSITO'),
				eq(movement.eventType, 'ISSUE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	const [transitoPending] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				eq(equipment.status, 'TRANSIT')
			)
		);

	// 3. Komoditi Stats
	const [komoditiActive] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				eq(equipment.status, 'IN_USE')
			)
		);

	const [komoditiOutgoing] = await db
		.select({ count: count() })
		.from(movement)
		.where(
			and(
				eq(movement.organizationId, orgId),
				eq(movement.classification, 'KOMUNITY'),
				eq(movement.eventType, 'ISSUE'),
				gte(movement.createdAt, firstDayOfMonth)
			)
		);

	// 4. Balkir Stats (Ready Stock/Main Inventory)
	const [balkirTotal] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				eq(equipment.status, 'READY')
			)
		);

	const [balkirDamaged] = await db
		.select({ count: count() })
		.from(equipment)
		.where(
			and(
				eq(equipment.organizationId, orgId),
				eq(equipment.status, 'READY'),
				sql`${equipment.condition} != 'BAIK'`
			)
		);

	// 5. Daftar Alat Terbaru (Sesuai mock sebelumnya)
	const recentEquipments = await db.query.equipment.findMany({
		where: (equipment, { eq }) => eq(equipment.organizationId, orgId),
		with: {
			item: true
		},
		limit: 5,
		orderBy: [desc(equipment.createdAt)]
	});

	// Transformasi data agar sesuai dengan UI
	return {
		summary: {
			activeInventory: activeInventoryCount.count || 0,
			warehouseStock: Number(warehouseStockSum.total) || 0,
			damagedItems: damagedItemsCount.count || 0,
			monthlyMovements: monthlyMovementsCount.count || 0
		},
		transito: {
			incoming: transitoIncoming.count || 0,
			outgoing: transitoOutgoing.count || 0,
			pending: transitoPending.count || 0
		},
		komoditi: {
			active: komoditiActive.count || 0,
			outgoing: komoditiOutgoing.count || 0,
			damaged: 0 // Statik atau perlu query spesifik per gudang
		},
		balkir: {
			total: balkirTotal.count || 0,
			used: komoditiActive.count || 0, // Menggunakan mapping status
			ready: balkirTotal.count || 0,
			damaged: balkirDamaged.count || 0
		},
		recentEquipments: recentEquipments.map((e) => ({
			id: e.id,
			name: e.item.name,
			brand: e.brand,
			serialNumber: e.serialNumber,
			type: e.item.equipmentType,
			condition: e.condition,
			status: e.status
		}))
	};
};

