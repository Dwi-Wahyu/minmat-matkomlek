import { query } from '$app/server';
import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement, organization } from '$lib/server/db/schema';
import { eq, and, like, sql, desc, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const alatSchema = v.object({
	orgSlug: v.string(),
	type: v.string(),
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export type AlatListData = {
	equipment: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getAlatData = query(alatSchema, async (args): Promise<AlatListData> => {
	const { user } = requireAuth();

	// Resolve organization ID from slug
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, args.orgSlug)
	});

	if (!org) {
		throw new Error('Organisasi tidak ditemukan');
	}

	const orgId = org.id;

	const { type, q: searchQuery, page = 1 } = args;
	const limit = 10;
	const offset = (page - 1) * limit;

	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	const filters = [eq(item.equipmentType, equipmentType), eq(equipment.organizationId, orgId)];

	if (searchQuery) {
		filters.push(
			sql`(${like(equipment.serialNumber, `%${searchQuery}%`)} OR ${like(item.name, `%${searchQuery}%`)} OR ${like(equipment.brand, `%${searchQuery}%`)})`
		);
	}

	const [dataRaw, totalCountResult] = await Promise.all([
		db
			.select({
				id: equipment.id,
				serialNumber: equipment.serialNumber,
				condition: equipment.condition,
				status: equipment.status,
				itemName: item.name,
				imagePath: item.imagePath,
				warehouseName: warehouse.name,
				createdAt: equipment.createdAt
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(and(...filters))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(equipment.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(and(...filters))
	]);

	const equipmentIds = dataRaw.map((e) => e.id);
	let lastMovements: any[] = [];

	if (equipmentIds.length > 0) {
		const subquery = db
			.select({
				equipmentId: movement.equipmentId,
				maxDate: sql<Date>`MAX(${movement.createdAt})`.as('max_date')
			})
			.from(movement)
			.where(inArray(movement.equipmentId, equipmentIds))
			.groupBy(movement.equipmentId)
			.as('latest');

		lastMovements = await db
			.select({
				id: movement.id,
				equipmentId: movement.equipmentId,
				eventType: movement.eventType,
				classification: movement.classification,
				createdAt: movement.createdAt,
				notes: movement.notes
			})
			.from(movement)
			.innerJoin(
				subquery,
				and(
					eq(movement.equipmentId, subquery.equipmentId),
					eq(movement.createdAt, subquery.maxDate)
				)
			);
	}

	const lastMovMap = new Map(lastMovements.map((m) => [m.equipmentId, m]));

	const equipmentWithMovements = dataRaw.map((eqp) => ({
		...eqp,
		lastMovement: lastMovMap.get(eqp.id) ?? null
	}));

	const totalItems = totalCountResult[0].count;

	return {
		equipment: equipmentWithMovements,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});
