import { query } from '$app/server';
import { db } from '$lib/server/db';
import { lending, member, equipment, organization } from '$lib/server/db/schema';
import { eq, or, desc, and, like, inArray } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import * as v from 'valibot';

const peminjamanSchema = v.object({
	orgSlug: v.string(),
	q: v.optional(v.string(), ''),
	status: v.optional(v.string(), 'ALL')
});

export type PeminjamanListData = {
	lendingList: any[];
	isInduk: boolean;
};

export const getPeminjamanData = query(
	peminjamanSchema,
	async (args): Promise<PeminjamanListData> => {
		const { user: currentUser } = requireAuth();
		const { orgSlug, q: searchQuery, status: statusFilter } = args;

		// Resolve organization ID from slug
		const org = await db.query.organization.findFirst({
			where: eq(organization.slug, orgSlug)
		});

		if (!org) {
			throw new Error('Organisasi tidak ditemukan');
		}

		const organizationId = org.id;

		const orgUserIdsSubquery = db
			.select({ id: member.userId })
			.from(member)
			.where(eq(member.organizationId, organizationId));

		const isInduk = org.parentId === null;

		const filters = isInduk
			? [eq(lending.organizationId, organizationId)]
			: [
					or(
						eq(lending.organizationId, organizationId),
						inArray(lending.requestedBy, orgUserIdsSubquery)
					)
				];

		if (statusFilter !== 'ALL') {
			filters.push(eq(lending.status, statusFilter as any));
		}

		if (searchQuery) {
			filters.push(like(lending.unit, `%${searchQuery}%`));
		}

		const data = await db.query.lending.findMany({
			where: and(...filters),
			with: {
				organization: true,
				requestedByUser: {
					columns: { name: true }
				}
			},
			orderBy: [desc(lending.createdAt)]
		});

		return {
			lendingList: data,
			isInduk
		};
	}
);

const availableEquipmentSchema = v.object({
	targetOrgId: v.string(),
	q: v.optional(v.string(), ''),
	page: v.optional(v.number(), 1),
	preselectedEquipmentId: v.optional(v.string(), ''),
	preselectedEquipmentIds: v.optional(v.array(v.string()), [])
});

export type GroupedEquipmentData = {
	groupedEquipment: any[];
	pagination: {
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};
};

export const getAvailableEquipment = query(
	availableEquipmentSchema,
	async (args): Promise<GroupedEquipmentData> => {
		const {
			targetOrgId,
			q: searchQuery = '',
			page = 1,
			preselectedEquipmentId = '',
			preselectedEquipmentIds = []
		} = args;
		const limit = 10;
		const offset = (page - 1) * limit;

		const allPreselectedIds = [...preselectedEquipmentIds];
		if (preselectedEquipmentId && !allPreselectedIds.includes(preselectedEquipmentId)) {
			allPreselectedIds.push(preselectedEquipmentId);
		}

		// 1. Fetch all READY equipment in targetOrgId OR equipment that is currently pre-selected
		const rawEquipment = await db.query.equipment.findMany({
			where: and(
				or(
					eq(equipment.status, 'READY'),
					allPreselectedIds.length > 0 ? inArray(equipment.id, allPreselectedIds) : undefined
				),
				eq(equipment.organizationId, targetOrgId)
			),
			with: {
				item: true,
				warehouse: true
			}
		});

		// 2. Grouping
		const groups: Record<string, any> = {};
		rawEquipment.forEach((eqp) => {
			const key = `${eqp.itemId}-${eqp.warehouseId}-${eqp.condition}`;
			if (!groups[key]) {
				groups[key] = {
					id: key,
					itemId: eqp.itemId,
					warehouseId: eqp.warehouseId,
					name: eqp.item.name,
					brand: eqp.brand,
					condition: eqp.condition,
					warehouseName: eqp.warehouse?.name,
					totalAvailable: 0,
					equipments: [],
					preselectedIds: []
				};
			}
			groups[key].totalAvailable++;
			groups[key].equipments.push({
				id: eqp.id,
				serialNumber: eqp.serialNumber,
				condition: eqp.condition,
				status: eqp.status
			});

			if (allPreselectedIds.includes(eqp.id)) {
				groups[key].preselected = true;
				groups[key].preselectedIds.push(eqp.id);
			}
		});

		let groupedList = Object.values(groups);

		// 3. Filter by search query if present
		if (searchQuery) {
			const lowerQ = searchQuery.toLowerCase();
			groupedList = groupedList.filter(
				(g: any) =>
					g.name.toLowerCase().includes(lowerQ) ||
					(g.brand && g.brand.toLowerCase().includes(lowerQ)) ||
					(g.warehouseName && g.warehouseName.toLowerCase().includes(lowerQ))
			);
		}

		// 4. Paginate
		const totalItems = groupedList.length;
		const paginatedList = groupedList.slice(offset, offset + limit);

		return {
			groupedEquipment: paginatedList,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalItems / limit),
				totalItems
			}
		};
	}
);
