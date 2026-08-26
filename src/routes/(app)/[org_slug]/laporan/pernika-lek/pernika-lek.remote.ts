import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { eq, sql, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';
import * as v from 'valibot';

const pernikaSchema = v.object({
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 50)
});

export type PernikaLekReportItem = {
	orgName: string;
	itemName: string;
	brand: string | null;
	unit: string;
	total: number;
	baik: number;
	rr: number;
	rb: number;
	ket: string | null;
	index: number;
};

export type PernikaLekGroupedData = {
	groupedReports: {
		orgName: string;
		items: PernikaLekReportItem[];
	}[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getPernikaLekData = query(
	pernikaSchema,
	async (args): Promise<PernikaLekGroupedData> => {
		const { user } = requireAuth();
		const orgSlug = user.organization.slug;
		const { page = 1, limit = 50 } = args;
		const offset = (page - 1) * limit;

		const cacheKey = `report:pernika-lek:${orgSlug}`;

		const allGrouped = await getOrSetCache(
			cacheKey,
			async () => {
				const conditions = [eq(item.equipmentType, 'PERNIKA_LEK')];

				// Jika user berasal dari sub-organisasi, hanya tampilkan data organisasinya sendiri
				if (user.organization.parentId) {
					conditions.push(eq(equipment.organizationId, user.organization.id));
				}

				const rawData = await db
					.select({
						orgName: organization.name,
						itemName: item.name,
						brand: equipment.brand,
						unit: item.baseUnit,
						total: sql<number>`cast(count(${equipment.id}) as unsigned)`,
						baik: sql<number>`cast(sum(case when ${equipment.condition} = 'BAIK' then 1 else 0 end) as unsigned)`,
						rr: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_RINGAN' then 1 else 0 end) as unsigned)`,
						rb: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_BERAT' then 1 else 0 end) as unsigned)`,
						ket: sql<string>`MAX(${item.description})`
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(organization, eq(equipment.organizationId, organization.id))
					.where(and(...conditions))
					.groupBy(organization.id, item.name, equipment.brand, item.baseUnit)
					.orderBy(organization.name, item.name);

				let globalCounter = 0;
				return rawData.reduce(
					(acc, curr) => {
						let existingOrg = acc.find((o: any) => o.orgName === curr.orgName);
						const itemWithIndex = { ...curr, index: ++globalCounter };

						if (existingOrg) {
							existingOrg.items.push(itemWithIndex);
						} else {
							acc.push({
								orgName: curr.orgName,
								items: [itemWithIndex]
							});
						}
						return acc;
					},
					[] as { orgName: string; items: PernikaLekReportItem[] }[]
				);
			},
			CacheTTL.LAPORAN
		);

		// Flatten all items to perform manual pagination while keeping global indexing
		const allItems = allGrouped.flatMap((org) => org.items);
		const totalItemsCount = allItems.length;
		const paginatedItems = allItems.slice(offset, offset + limit);

		// Re-group paginated items
		const regrouped = paginatedItems.reduce(
			(acc, curr) => {
				let existingOrg = acc.find((o) => o.orgName === curr.orgName);
				if (existingOrg) {
					existingOrg.items.push(curr);
				} else {
					acc.push({
						orgName: curr.orgName,
						items: [curr]
					});
				}
				return acc;
			},
			[] as { orgName: string; items: PernikaLekReportItem[] }[]
		);

		return {
			groupedReports: regrouped,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalItemsCount / limit),
				totalItems: totalItemsCount
			}
		};
	}
);
