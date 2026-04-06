import { db } from '$lib/server/db';
import { item, equipment, warehouse } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug } = params;

	try {
		const reports = await db
			.select({
				// Sesuai Skema: brand ada di equipment, name & baseUnit di item
				itemId: item.id,
				itemName: item.name,
				itemDescription: item.description,
				unit: item.baseUnit,
				brand: equipment.brand,
				serialNumber: equipment.serialNumber,
				condition: equipment.condition
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.innerJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug));

		return {
			reports: reports ?? []
		};
	} catch (err) {
		console.error('Error fetching BTK-16:', err);
		throw error(500, 'Internal Server Error');
	}
};
