import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	equipment,
	stock,
	movement,
	warehouse,
	item,
	organization
} from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug dari URL - Menggunakan select eksplisit untuk keamanan
	const orgResult = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, params.org_slug))
		.limit(1);

	if (orgResult.length === 0) {
		throw error(404, 'Organization not found');
	}

	const org = orgResult[0];
	const orgId = org.id;

	// Periode Bulan Ini
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// Ringkasan Stats (Top Cards)
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
		.where(and(eq(equipment.organizationId, orgId), sql`${equipment.condition} != 'BAIK'`));

	const [monthlyMovementsCount] = await db
		.select({ count: count() })
		.from(movement)
		.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, firstDayOfMonth)));

	// Transito Stats
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
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT')));

	// Komoditi Stats
	const [komoditiActive] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'IN_USE')));

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

	// Balkir Stats (Ready Stock/Main Inventory)
	const [balkirTotal] = await db
		.select({ count: count() })
		.from(equipment)
		.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'READY')));

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

	// Daftar Alat Terbaru - Menggunakan join eksplisit untuk menghindari LEFT JOIN LATERAL
	const recentEquipmentsResults = await db
		.select({
			equipment: equipment,
			item: item
		})
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.where(eq(equipment.organizationId, orgId))
		.limit(5)
		.orderBy(desc(equipment.createdAt));

	// Transformasi data agar sesuai dengan UI
	return {
		org_slug: params.org_slug,
		summary: {
			activeInventory: Number(activeInventoryCount?.count) || 0,
			warehouseStock: Number(warehouseStockSum?.total) || 0,
			damagedItems: Number(damagedItemsCount?.count) || 0,
			monthlyMovements: Number(monthlyMovementsCount?.count) || 0
		},
		transito: {
			incoming: Number(transitoIncoming?.count) || 0,
			outgoing: Number(transitoOutgoing?.count) || 0,
			pending: Number(transitoPending?.count) || 0
		},
		komoditi: {
			active: Number(komoditiActive?.count) || 0,
			outgoing: Number(komoditiOutgoing?.count) || 0,
			damaged: 0
		},
		balkir: {
			total: Number(balkirTotal?.count) || 0,
			used: Number(komoditiActive?.count) || 0,
			ready: Number(balkirTotal?.count) || 0,
			damaged: Number(balkirDamaged?.count) || 0
		},
		recentEquipments: recentEquipmentsResults.map((r) => ({
			id: r.equipment.id,
			name: r.item.name,
			brand: r.equipment.brand,
			serialNumber: r.equipment.serialNumber,
			type: r.item.equipmentType,
			condition: r.equipment.condition,
			status: r.equipment.status
		}))
	};
};
