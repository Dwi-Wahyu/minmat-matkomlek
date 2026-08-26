import { query } from '$app/server';
import { db } from '$lib/server/db';
import { item as itemTable, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, exists } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type KonversiUnitListData = {
	conversions: any[];
	items: any[];
};

export const getKonversiUnitData = query(async (): Promise<KonversiUnitListData> => {
	const { user } = requireAuth();
	const organizationId = user.organization.id;

	const conversions = await db.query.itemUnitConversion.findMany({
		where: (table, { exists, and, eq }) =>
			exists(
				db
					.select()
					.from(stock)
					.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
					.where(and(eq(stock.itemId, table.itemId), eq(warehouse.organizationId, organizationId)))
			),
		with: {
			item: true
		},
		orderBy: (conv, { asc }) => [asc(conv.itemId)]
	});

	const items = await db
		.select({
			id: itemTable.id,
			name: itemTable.name,
			baseUnit: itemTable.baseUnit
		})
		.from(itemTable)
		.where(
			and(
				eq(itemTable.type, 'CONSUMABLE'),
				exists(
					db
						.select()
						.from(stock)
						.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
						.where(
							and(eq(stock.itemId, itemTable.id), eq(warehouse.organizationId, organizationId))
						)
				)
			)
		)
		.orderBy(itemTable.name);

	return { conversions, items };
});
