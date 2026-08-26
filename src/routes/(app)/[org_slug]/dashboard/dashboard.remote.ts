import { query } from '$app/server';
import { db } from '$lib/server/db';
import { equipment, stock, movement, warehouse, item, organization } from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql, inArray, or } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type DashboardData = {
	org_slug: string;
	activeFilters: {
		period: string;
		equipmentType: string;
	};
	summary: {
		activeInventory: number;
		warehouseStock: number;
		damagedItems: number;
		monthlyMovements: number;
	};
	transito: {
		total: number;
	};
	komoditi: {
		total: number;
	};
	balkir: {
		total: number;
	};
	recentEquipments: {
		id: string;
		name: string;
		brand: string | null;
		serialNumber: string | null;
		type: 'ALKOMLEK' | 'PERNIKA_LEK';
		condition: string;
		status: string;
	}[];
};

export const getDashboardData = query(
	async (args?: {
		orgSlug?: string;
		period?: string;
		equipmentType?: string;
	}): Promise<DashboardData> => {
		const { user } = requireAuth();

		const orgSlug = args?.orgSlug || user.organization.slug;

		// Resolve organization ID from slug
		const org = await db.query.organization.findFirst({
			where: eq(organization.slug, orgSlug)
		});

		if (!org) {
			throw new Error('Organisasi tidak ditemukan');
		}

		const orgId = org.id;

		const period = args?.period || 'this_month';
		const equipmentType = args?.equipmentType || 'ALL';

		const cacheKey = `dashboard:${orgId}:${period}:${equipmentType}`;

		return await getOrSetCache(
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

				const [activeInventoryCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter));

				const [warehouseStockSum] = await db
					.select({ total: sum(stock.qty) })
					.from(stock)
					.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
					.where(eq(warehouse.organizationId, orgId));

				const [damagedItemsCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					);

				const [monthlyMovementsCount] = await db
					.select({ count: count() })
					.from(movement)
					.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startDate)));

				const [transitoCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							or(eq(equipment.classification, 'TRANSITO'), eq(equipment.status, 'TRANSIT')),
							equipmentTypeFilter
						)
					);

				const [komoditiCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							or(eq(equipment.classification, 'KOMUNITY'), eq(equipment.status, 'IN_USE')),
							equipmentTypeFilter
						)
					);

				const [balkirCount] = await db
					.select({ count: count() })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							eq(equipment.classification, 'BALKIR'),
							equipmentTypeFilter
						)
					);

				const recentEquipmentsResults = await db
					.select({
						equipment: equipment,
						item: item
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(and(eq(equipment.organizationId, orgId), equipmentTypeFilter))
					.limit(5)
					.orderBy(desc(equipment.createdAt));

				return {
					org_slug: orgSlug,
					activeFilters: {
						period,
						equipmentType
					},
					summary: {
						activeInventory: Number(activeInventoryCount?.count) || 0,
						warehouseStock: Number(warehouseStockSum?.total) || 0,
						damagedItems: Number(damagedItemsCount?.count) || 0,
						monthlyMovements: Number(monthlyMovementsCount?.count) || 0
					},
					transito: {
						total: Number(transitoCount?.count) || 0
					},
					komoditi: {
						total: Number(komoditiCount?.count) || 0
					},
					balkir: {
						total: Number(balkirCount?.count) || 0
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
			},
			CacheTTL.DASHBOARD
		);
	}
);
