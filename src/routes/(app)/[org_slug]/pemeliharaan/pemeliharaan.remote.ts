import { query } from '$app/server';
import { db } from '$lib/server/db';
import { maintenance, equipment } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const pemeliharaanSchema = v.object({
	equipmentIds: v.optional(v.array(v.string()), [])
});

export type PemeliharaanListData = {
	maintenance: any[];
	equipment: any[];
};

export const getPemeliharaanData = query(
	pemeliharaanSchema,
	async (args): Promise<PemeliharaanListData> => {
		const { user } = requireAuth();
		const orgId = user.organization.id;
		const { equipmentIds } = args;

		const maintenanceList = await db.query.maintenance.findMany({
			where:
				equipmentIds && equipmentIds.length > 0
					? inArray(maintenance.equipmentId, equipmentIds)
					: undefined,
			with: {
				equipment: {
					with: {
						item: true
					}
				}
			},
			orderBy: [desc(maintenance.scheduledDate)]
		});

		const equipmentList = await db.query.equipment.findMany({
			where: eq(equipment.organizationId, orgId),
			with: {
				item: true
			}
		});

		const filteredMaintenance = maintenanceList.filter(
			(m) => m.equipment?.organizationId === orgId
		);

		return {
			maintenance: filteredMaintenance,
			equipment: equipmentList
		};
	}
);

const equipmentQuerySchema = v.object({
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1)
});

export type PaginatedEquipmentList = {
	equipment: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getAvailableEquipmentForMaintenance = query(
	equipmentQuerySchema,
	async (args): Promise<PaginatedEquipmentList> => {
		const { user } = requireAuth();
		const orgId = user.organization.id;
		const { q = '', page = 1 } = args;
		const limit = 5;
		const offset = (page - 1) * limit;

		const rawEquipment = await db.query.equipment.findMany({
			where: eq(equipment.organizationId, orgId),
			with: {
				item: true,
				warehouse: true
			}
		});

		let filtered = rawEquipment;
		if (q) {
			const lowerQ = q.toLowerCase();
			filtered = rawEquipment.filter((eqp) => eqp.item?.name?.toLowerCase().includes(lowerQ));
		}

		// Sort by item name
		filtered.sort((a, b) => (a.item?.name || '').localeCompare(b.item?.name || ''));

		const totalItems = filtered.length;
		const paginated = filtered.slice(offset, offset + limit);

		return {
			equipment: paginated,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalItems / limit),
				totalItems
			}
		};
	}
);
