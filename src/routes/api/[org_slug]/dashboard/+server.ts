import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item, stock, movement, warehouse, organization } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, sql, desc, inArray, or } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

export const GET: RequestHandler = async ({ locals, params, url }) => {
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

	// Baca filter dari URL search params
	const period = url.searchParams.get('period') || 'this_month';
	const equipmentType = url.searchParams.get('type') || 'ALL'; // 'ALL' | 'ALKOMLEK' | 'PERNIKA_LEK'

	const cacheKey = `dashboard:${orgId}:${period}:${equipmentType}`;

	const dashboardData = await getOrSetCache(
		cacheKey,
		async () => {
			const now = new Date();
			let startDate: Date;

			switch (period) {
				case '3_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
					break;
				case '6_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
					break;
				case 'this_year':
					startDate = new Date(now.getFullYear(), 0, 1);
					break;
				case 'this_month':
				default:
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
			}

			// Filter tipe alat — null berarti tidak difilter (ALL)
			const equipmentTypeFilter =
				equipmentType !== 'ALL'
					? eq(item.equipmentType, equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
					: undefined;

			// Eksekusi Parallel Queries (Optimasi)
			const [
				activeInventoryCount,
				warehouseStockSum,
				damagedItemsCount,
				monthlyMovementsCount,
				transitoCount,
				komoditiCount,
				balkirCount,
				recentEquipments
			] = await Promise.all([
				// Summary Stats
				db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							equipmentTypeFilter
						)
					),
				db
					.select({ total: sum(stock.qty) })
					.from(stock)
					.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
					.where(eq(warehouse.organizationId, orgId)),
				db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					),
				db
					.select({ count: count() })
					.from(movement)
					.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startDate))),

				// Transito Total
				db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							or(eq(equipment.classification, 'TRANSITO'), eq(equipment.status, 'TRANSIT')),
							equipmentTypeFilter
						)
					),

				// Komoditi Total
				db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							or(eq(equipment.classification, 'KOMUNITY'), eq(equipment.status, 'IN_USE')),
							equipmentTypeFilter
						)
					),

				// Balkir Total
				db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.classification, 'BALKIR'),
							equipmentTypeFilter
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
					.where(
						and(
							eq(equipment.organizationId, orgId),
							equipmentTypeFilter
						)
					)
					.orderBy(desc(equipment.createdAt))
					.limit(5)
			]);

			return {
				org_slug: params.org_slug,
				activeFilters: {
					period,
					equipmentType
				},
				summary: {
					activeInventory: Number(activeInventoryCount[0]?.count) || 0,
					warehouseStock: Number(warehouseStockSum[0]?.total) || 0,
					damagedItems: Number(damagedItemsCount[0]?.count) || 0,
					monthlyMovements: Number(monthlyMovementsCount[0]?.count) || 0
				},
				transito: {
					total: Number(transitoCount[0]?.count) || 0
				},
				komoditi: {
					total: Number(komoditiCount[0]?.count) || 0
				},
				balkir: {
					total: Number(balkirCount[0]?.count) || 0
				},
				recentEquipments: recentEquipments.map((e) => ({
					id: e.id,
					name: e.item.name,
					brand: e.brand,
					serialNumber: e.serialNumber,
					condition: e.condition,
					status: e.status
				}))
			};
		},
		CacheTTL.DASHBOARD
	);

	return json(dashboardData);
};
