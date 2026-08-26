import { query } from '$app/server';
import { db } from '$lib/server/db';
import { distribution, equipment, item, stock, warehouse } from '$lib/server/db/schema';
import { eq, or, desc, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

export type DistribusiListData = {
	distributions: any[];
	currentOrgId: string;
};

export const getDistribusiData = query(async (): Promise<DistribusiListData> => {
	const { user } = requireAuth();
	const orgId = user.organization.id;

	const distributions = await db.query.distribution.findMany({
		where: or(eq(distribution.fromOrganizationId, orgId), eq(distribution.toOrganizationId, orgId)),
		with: {
			fromOrganization: true,
			toOrganization: true,
			requestedByUser: true,
			equipmentItems: true,
			consumableItems: true
		},
		orderBy: [desc(distribution.createdAt)]
	});

	return {
		distributions,
		currentOrgId: orgId
	};
});

const availableEquipmentSchema = v.object({
	orgId: v.string(),
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export const getAvailableEquipment = query(availableEquipmentSchema, async (args) => {
	const { orgId, q: searchQuery = '', page = 1 } = args;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Fetch all READY equipment in this org
	const rawEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.status, 'READY'), eq(equipment.organizationId, orgId)),
		with: {
			item: true,
			warehouse: true
		}
	});

	let filteredList = rawEquipment;
	if (searchQuery) {
		const lowerQ = searchQuery.toLowerCase();
		filteredList = rawEquipment.filter(
			(e: any) =>
				e.item.name.toLowerCase().includes(lowerQ) ||
				(e.serialNumber && e.serialNumber.toLowerCase().includes(lowerQ)) ||
				(e.brand && e.brand.toLowerCase().includes(lowerQ))
		);
	}

	const totalItems = filteredList.length;
	const paginatedList = filteredList.slice(offset, offset + limit);

	return {
		items: paginatedList,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});

const availableConsumableSchema = v.object({
	orgId: v.string(),
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export const getAvailableConsumables = query(availableConsumableSchema, async (args) => {
	const { orgId, q: searchQuery = '', page = 1 } = args;
	const limit = 10;
	const offset = (page - 1) * limit;

	// Fetch warehouses for this organization to scope stock check
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, orgId),
		columns: { id: true }
	});
	const warehouseIds = warehouses.map((w) => w.id);

	// Fetch items that are CONSUMABLE
	const consumableItems = await db.query.item.findMany({
		where: eq(item.type, 'CONSUMABLE'),
		with: {
			stocks: {
				where: (s, { inArray }) =>
					warehouseIds.length > 0 ? inArray(s.warehouseId, warehouseIds) : eq(s.warehouseId, 'none')
			}
		}
	});

	const mappedItems = consumableItems.map((it) => ({
		...it,
		totalStock: it.stocks.reduce((acc, s) => acc + parseFloat(s.qty as any), 0)
	}));

	let filteredList = mappedItems;
	if (searchQuery) {
		const lowerQ = searchQuery.toLowerCase();
		filteredList = mappedItems.filter((it: any) => it.name.toLowerCase().includes(lowerQ));
	}

	const totalItems = filteredList.length;
	const paginatedList = filteredList.slice(offset, offset + limit);

	return {
		items: paginatedList,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		}
	};
});
