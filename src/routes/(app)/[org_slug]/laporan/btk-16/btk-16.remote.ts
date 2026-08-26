import { query } from '$app/server';
import { db } from '$lib/server/db';
import {
	item,
	equipment,
	warehouse,
	organization,
	lending,
	lendingItem,
	movement,
	itemCategory
} from '$lib/server/db/schema';
import { eq, and, sql, asc, lte, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

// Validasi request query params
const btkSchema = v.object({
	reportType: v.picklist(['TRIWULAN', 'NOMINATIF', 'BULANAN']),
	periodStr: v.string(), // Format YYYY-MM atau YYYY-Q1
	categoryId: v.optional(v.string()),
	page: v.optional(v.number(), 1),
	limit: v.optional(v.number(), 20)
});

export type GroupedBtkItem = {
	itemId: string;
	itemName: string;
	baseUnit: string;
	equipments?: {
		id: string;
		serialNumber: string;
		brand: string | null;
		condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
		year: string | null;
		statusInfo: string;
	}[];
	totalStock?: number;
	baik?: number;
	rusakRingan?: number;
	rusakBerat?: number;
	rusakTotal?: number;
	keterangan?: string;
	twLalu?: number;
	tambah?: number;
	kurang?: number;
	sekarang?: number;
};

export type GroupedBtkSubCategory = {
	id: string;
	name: string;
	order: number;
	items: GroupedBtkItem[];
};

export type GroupedBtkData = {
	id: string;
	name: string;
	order: number;
	subCategories: GroupedBtkSubCategory[];
};

export type Btk16Data = {
	reports: GroupedBtkData[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

function parsePeriod(reportType: string, periodStr: string) {
	let startDate = new Date('1970-01-01');
	let endDate = new Date();

	if (!periodStr) return { startDate, endDate };

	if (reportType === 'TRIWULAN') {
		const match = periodStr.match(/^(\d{4})-Q([1-4])$/);
		if (match) {
			const year = parseInt(match[1]);
			const q = parseInt(match[2]);
			if (q === 1) {
				startDate = new Date(`${year}-01-01T00:00:00.000Z`);
				endDate = new Date(`${year}-03-31T23:59:59.999Z`);
			} else if (q === 2) {
				startDate = new Date(`${year}-04-01T00:00:00.000Z`);
				endDate = new Date(`${year}-06-30T23:59:59.999Z`);
			} else if (q === 3) {
				startDate = new Date(`${year}-07-01T00:00:00.000Z`);
				endDate = new Date(`${year}-09-30T23:59:59.999Z`);
			} else if (q === 4) {
				startDate = new Date(`${year}-10-01T00:00:00.000Z`);
				endDate = new Date(`${year}-12-31T23:59:59.999Z`);
			}
		}
	} else {
		const match = periodStr.match(/^(\d{4})-(\d{2})$/);
		if (match) {
			const year = parseInt(match[1]);
			const month = parseInt(match[2]);
			startDate = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
			const lastDay = new Date(year, month, 0).getDate();
			endDate = new Date(
				`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
			);
		}
	}
	return { startDate, endDate };
}

export const getBtk16Data = query(btkSchema, async (args): Promise<Btk16Data> => {
	const { user } = requireAuth();
	const orgSlug = user.organization.slug;

	const { reportType, periodStr, categoryId, page = 1, limit = 20 } = args;
	const offset = (page - 1) * limit;
	const { startDate, endDate } = parsePeriod(reportType, periodStr);

	const cacheKey = `report:btk-16:${orgSlug}:type_${reportType}:period_${periodStr}:cat_${categoryId || 'all'}:p_${page}:l_${limit}`;

	return getOrSetCache(
		cacheKey,
		async () => {
			// 1. Fetch categories
			const allCategories = await db.query.itemCategory.findMany({
				orderBy: [asc(itemCategory.order), asc(itemCategory.name)]
			});

			const mainCats = allCategories.filter((c) => !c.parentId);
			const subCats = allCategories.filter((c) => c.parentId);

			const targetCategoryIds = categoryId
				? [categoryId, ...allCategories.filter((c) => c.parentId === categoryId).map((c) => c.id)]
				: [];

			// 2. Build Category Tree
			const tree: GroupedBtkData[] = mainCats.map((c) => {
				const subCategoriesList = subCats
					.filter((sc) => sc.parentId === c.id)
					.map((sc) => ({
						id: sc.id,
						name: sc.name,
						order: sc.order || 0,
						items: [] as GroupedBtkItem[]
					}));

				// Sisipkan sub-kategori virtual dengan ID = main category ID
				// agar item yang dikaitkan langsung ke Kategori Utama (Level 1) dapat tertampung di sini.
				subCategoriesList.push({
					id: c.id,
					name: `Umum (${c.name})`,
					order: -1,
					items: []
				});

				return {
					id: c.id,
					name: c.name,
					order: c.order || 0,
					subCategories: subCategoriesList
				};
			});

			// Add fallback Virtual category
			const virtualMainCat: GroupedBtkData = {
				id: 'LAIN-LAIN',
				name: 'LAIN-LAIN',
				order: 9999,
				subCategories: [
					{
						id: 'LAIN-LAIN',
						name: 'LAIN-LAIN',
						order: 9999,
						items: []
					}
				]
			};
			tree.push(virtualMainCat);

			// Helper to insert item into tree based on subCategoryId
			function insertItemToTree(subCategoryId: string | null, groupedItem: GroupedBtkItem) {
				const targetSubId = subCategoryId || 'LAIN-LAIN';
				let inserted = false;

				for (const mainCat of tree) {
					const subCat = mainCat.subCategories.find((sc) => sc.id === targetSubId);
					if (subCat) {
						subCat.items.push(groupedItem);
						inserted = true;
						break;
					}
				}

				if (!inserted) {
					virtualMainCat.subCategories[0].items.push(groupedItem);
				}
			}

			let totalItems = 0;

			// 3. Process query logic based on Report Type
			if (reportType === 'NOMINATIF') {
				// NOMINATIF: Total count of equipments
				const countRes = await db
					.select({ count: sql<number>`count(*)` })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					);
				totalItems = Number(countRes[0]?.count || 0);

				// Paginated query
				const eqData = await db
					.select({
						eqId: equipment.id,
						serialNumber: equipment.serialNumber,
						brand: equipment.brand,
						condition: equipment.condition,
						createdAt: equipment.createdAt,
						itemId: item.id,
						itemName: item.name,
						baseUnit: item.baseUnit,
						subCategoryId: item.categoryId,
						lendingUnit: lending.unit,
						lendingStatus: lending.status
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.leftJoin(lendingItem, eq(equipment.id, lendingItem.equipmentId))
					.leftJoin(
						lending,
						and(eq(lendingItem.lendingId, lending.id), eq(lending.status, 'DIPINJAM'))
					)
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					)
					.limit(limit)
					.offset(offset)
					.orderBy(asc(item.name), asc(equipment.serialNumber));

				// Group equipments by itemId
				const itemEquipmentsMap = new Map<
					string,
					{ itemId: string; name: string; unit: string; catId: string | null; eqs: any[] }
				>();

				for (const row of eqData) {
					if (!itemEquipmentsMap.has(row.itemId)) {
						itemEquipmentsMap.set(row.itemId, {
							itemId: row.itemId,
							name: row.itemName,
							unit: row.baseUnit,
							catId: row.subCategoryId,
							eqs: []
						});
					}

					const yearStr = row.createdAt ? new Date(row.createdAt).getFullYear().toString() : '-';
					const statusText =
						row.lendingStatus === 'DIPINJAM' ? `Dipinjam oleh ${row.lendingUnit}` : 'Di gudang';

					itemEquipmentsMap.get(row.itemId)!.eqs.push({
						id: row.eqId,
						serialNumber: row.serialNumber,
						brand: row.brand,
						condition: row.condition,
						year: yearStr,
						statusInfo: statusText
					});
				}

				for (const [_, data] of itemEquipmentsMap.entries()) {
					insertItemToTree(data.catId, {
						itemId: data.itemId,
						itemName: data.name,
						baseUnit: data.unit,
						equipments: data.eqs
					});
				}
			} else if (reportType === 'BULANAN') {
				// BULANAN: Total count of items
				const countRes = await db
					.select({ count: sql<number>`count(distinct ${item.id})` })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					);
				totalItems = Number(countRes[0]?.count || 0);

				// Paginated aggregated query
				const monthlyData = await db
					.select({
						itemId: item.id,
						itemName: item.name,
						baseUnit: item.baseUnit,
						subCategoryId: item.categoryId,
						baik: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'BAIK' THEN 1 ELSE 0 END)`,
						rusakRingan: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_RINGAN' THEN 1 ELSE 0 END)`,
						rusakBerat: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_BERAT' THEN 1 ELSE 0 END)`,
						rusakTotal: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_TOTAL' THEN 1 ELSE 0 END)`,
						total: sql<number>`COUNT(${equipment.id})`
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					)
					.groupBy(item.id, item.name, item.baseUnit, item.categoryId)
					.limit(limit)
					.offset(offset)
					.orderBy(asc(item.name));

				// Get active lendings for keterangan
				const activeLendings = await db
					.select({
						itemId: equipment.itemId,
						unit: lending.unit
					})
					.from(lendingItem)
					.innerJoin(equipment, eq(lendingItem.equipmentId, equipment.id))
					.innerJoin(lending, eq(lendingItem.lendingId, lending.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							eq(lending.status, 'DIPINJAM'),
							lte(equipment.createdAt, endDate)
						)
					);

				const lendingMap = new Map<string, Set<string>>();
				for (const row of activeLendings) {
					if (!row.itemId || !row.unit) continue;
					if (!lendingMap.has(row.itemId)) {
						lendingMap.set(row.itemId, new Set());
					}
					lendingMap.get(row.itemId)!.add(row.unit);
				}

				for (const row of monthlyData) {
					const unitsSet = lendingMap.get(row.itemId);
					const ket = unitsSet ? Array.from(unitsSet).join(', ') : 'Di gudang';

					insertItemToTree(row.subCategoryId, {
						itemId: row.itemId,
						itemName: row.itemName,
						baseUnit: row.baseUnit,
						baik: Number(row.baik || 0),
						rusakRingan: Number(row.rusakRingan || 0),
						rusakBerat: Number(row.rusakBerat || 0),
						rusakTotal: Number(row.rusakTotal || 0),
						totalStock: Number(row.total || 0),
						keterangan: ket
					});
				}
			} else if (reportType === 'TRIWULAN') {
				// TRIWULAN: Total count of items
				const countRes = await db
					.select({ count: sql<number>`count(distinct ${item.id})` })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					);
				totalItems = Number(countRes[0]?.count || 0);

				// Current stock as of end of quarter
				const currentStock = await db
					.select({
						itemId: item.id,
						itemName: item.name,
						baseUnit: item.baseUnit,
						subCategoryId: item.categoryId,
						baik: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'BAIK' THEN 1 ELSE 0 END)`,
						rusakRingan: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_RINGAN' THEN 1 ELSE 0 END)`,
						rusakBerat: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_BERAT' THEN 1 ELSE 0 END)`,
						rusakTotal: sql<number>`SUM(CASE WHEN ${equipment.condition} = 'RUSAK_TOTAL' THEN 1 ELSE 0 END)`,
						total: sql<number>`COUNT(${equipment.id})`
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
					.innerJoin(organization, eq(warehouse.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							lte(equipment.createdAt, endDate),
							categoryId ? inArray(item.categoryId, targetCategoryIds) : undefined
						)
					)
					.groupBy(item.id, item.name, item.baseUnit, item.categoryId)
					.limit(limit)
					.offset(offset)
					.orderBy(asc(item.name));

				// Group movement aggregates for TAMBAH / KURANG within the quarter
				const movements = await db
					.select({
						itemId: movement.itemId,
						eventType: movement.eventType,
						count: sql<number>`COUNT(${movement.id})`
					})
					.from(movement)
					.innerJoin(organization, eq(movement.organizationId, organization.id))
					.where(
						and(
							eq(organization.slug, orgSlug),
							sql`${movement.createdAt} >= ${startDate}`,
							sql`${movement.createdAt} <= ${endDate}`
						)
					)
					.groupBy(movement.itemId, movement.eventType);

				const movementMap = new Map<string, { tambah: number; kurang: number }>();
				for (const row of movements) {
					if (!row.itemId) continue;
					if (!movementMap.has(row.itemId)) {
						movementMap.set(row.itemId, { tambah: 0, kurang: 0 });
					}
					const entry = movementMap.get(row.itemId)!;
					if (['RECEIVE', 'DISTRIBUTE_IN', 'TRANSFER_IN'].includes(row.eventType)) {
						entry.tambah += Number(row.count || 0);
					}
					if (['DISPOSED', 'DISTRIBUTE_OUT', 'TRANSFER_OUT'].includes(row.eventType)) {
						entry.kurang += Number(row.count || 0);
					}
				}

				for (const row of currentStock) {
					const mvt = movementMap.get(row.itemId) || { tambah: 0, kurang: 0 };
					const sekarang = Number(row.total || 0);
					const twLalu = sekarang - mvt.tambah + mvt.kurang;

					insertItemToTree(row.subCategoryId, {
						itemId: row.itemId,
						itemName: row.itemName,
						baseUnit: row.baseUnit,
						twLalu: twLalu >= 0 ? twLalu : 0,
						tambah: mvt.tambah,
						kurang: mvt.kurang,
						sekarang: sekarang,
						baik: Number(row.baik || 0),
						rusakRingan: Number(row.rusakRingan || 0),
						rusakBerat: Number(row.rusakBerat || 0),
						rusakTotal: Number(row.rusakTotal || 0),
						totalStock: sekarang,
						keterangan: `Stok TW: ${sekarang}`
					});
				}
			}

			// 4. Filter empty subcategories or categories to keep report clean
			let filteredTree = tree
				.map((mainCat) => ({
					...mainCat,
					subCategories: mainCat.subCategories.filter((sc) => sc.items.length > 0)
				}))
				.filter((mainCat) => mainCat.subCategories.length > 0);

			// If categoryId filter is applied, only return that main category tree branch
			if (categoryId) {
				filteredTree = filteredTree.filter((c) => c.id === categoryId);
			}

			return {
				reports: filteredTree,
				pagination: {
					currentPage: page,
					totalPages: Math.ceil(totalItems / limit),
					totalItems
				}
			};
		},
		CacheTTL.LAPORAN
	);
});
