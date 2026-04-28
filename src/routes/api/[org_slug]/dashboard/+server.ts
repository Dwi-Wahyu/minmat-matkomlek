import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item, stock, movement, warehouse, organization } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, sql, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	// Validasi Auth
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const orgId = org.id;
	const now = new Date();
	const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	// Eksekusi Parallel Queries (Optimasi)
	// Kita bisa menjalankan semua query secara bersamaan menggunakan Promise.all
	const [
		activeInventoryCount,
		warehouseStockSum,
		damagedItemsCount,
		monthlyMovementsCount,
		transitoIncoming,
		transitoOutgoing,
		transitoPending,
		komoditiActive,
		komoditiOutgoing,
		balkirTotal,
		balkirDamaged,
		balkirIncoming,
		balkirOutgoing,
		recentEquipments
	] = await Promise.all([
		// Summary Stats
		db.select({ count: count() }).from(equipment).where(eq(equipment.organizationId, orgId)),
		db
			.select({ total: sum(stock.qty) })
			.from(stock)
			.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(eq(warehouse.organizationId, orgId)),
		db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), sql`${equipment.condition} != 'BAIK'`)),
		db
			.select({ count: count() })
			.from(movement)
			.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, firstDayOfMonth))),

		// Transito
		db
			.select({ count: count() })
			.from(movement)
			.where(
				and(
					eq(movement.organizationId, orgId),
					eq(movement.classification, 'TRANSITO'),
					eq(movement.eventType, 'RECEIVE'),
					gte(movement.createdAt, firstDayOfMonth)
				)
			),
		db
			.select({ count: count() })
			.from(movement)
			.where(
				and(
					eq(movement.organizationId, orgId),
					eq(movement.classification, 'TRANSITO'),
					eq(movement.eventType, 'ISSUE'),
					gte(movement.createdAt, firstDayOfMonth)
				)
			),
		db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT'))),

		// Komoditi
		db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'IN_USE'))),
		db
			.select({ count: count() })
			.from(movement)
			.where(
				and(
					eq(movement.organizationId, orgId),
					eq(movement.classification, 'KOMUNITY'),
					eq(movement.eventType, 'ISSUE'),
					gte(movement.createdAt, firstDayOfMonth)
				)
			),

		// Balkir
		db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'READY'))),
		db
			.select({ count: count() })
			.from(equipment)
			.where(
				and(
					eq(equipment.organizationId, orgId),
					eq(equipment.status, 'READY'),
					sql`${equipment.condition} != 'BAIK'`
				)
			),
		db
			.select({ count: count() })
			.from(movement)
			.where(
				and(
					eq(movement.organizationId, orgId),
					eq(movement.classification, 'BALKIR'),
					eq(movement.eventType, 'RECEIVE'),
					gte(movement.createdAt, firstDayOfMonth)
				)
			),
		db
			.select({ count: count() })
			.from(movement)
			.where(
				and(
					eq(movement.organizationId, orgId),
					eq(movement.classification, 'BALKIR'),
					eq(movement.eventType, 'ISSUE'),
					gte(movement.createdAt, firstDayOfMonth)
				)
			),

		// Recent Equipment
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				brand: equipment.brand,
				condition: equipment.condition,
				status: equipment.status,
				createdAt: equipment.createdAt,
				item: {
					name: item.name
				}
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(eq(equipment.organizationId, orgId))
			.orderBy(desc(equipment.createdAt))
			.limit(5)
	]);

	// Transformasi & Return Response
	return json({
		summary: {
			activeInventory: Number(activeInventoryCount[0]?.count) || 0,
			warehouseStock: Number(warehouseStockSum[0]?.total) || 0,
			damagedItems: Number(damagedItemsCount[0]?.count) || 0,
			monthlyMovements: Number(monthlyMovementsCount[0]?.count) || 0
		},
		transito: {
			incoming: Number(transitoIncoming[0]?.count) || 0,
			outgoing: Number(transitoOutgoing[0]?.count) || 0,
			pending: Number(transitoPending[0]?.count) || 0
		},
		komoditi: {
			active: Number(komoditiActive[0]?.count) || 0,
			outgoing: Number(komoditiOutgoing[0]?.count) || 0,
			damaged: 0 // Sesuaikan jika ada kriteria spesifik
		},
		balkir: {
			total: Number(balkirTotal[0]?.count) || 0,
			ready: Number(balkirTotal[0]?.count) || 0,
			damaged: Number(balkirDamaged[0]?.count) || 0,
			incoming: Number(balkirIncoming[0]?.count) || 0,
			outgoing: Number(balkirOutgoing[0]?.count) || 0
		},
		recentEquipments: recentEquipments.map((e) => ({
			id: e.id,
			name: e.item.name,
			brand: e.brand,
			serialNumber: e.serialNumber,
			condition: e.condition,
			status: e.status
		}))
	});
};
