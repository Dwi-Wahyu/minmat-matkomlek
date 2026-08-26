import { db } from '$lib/server/db';
import { distribution, organization } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Kesatuan tidak ditemukan');

	// PERUBAHAN: tidak di-await, dikembalikan sebagai Promise
	const distributionsPromise = db.query.distribution.findMany({
		where: (d, { or, eq }) => or(eq(d.fromOrganizationId, org.id), eq(d.toOrganizationId, org.id)),
		with: {
			fromOrganization: true,
			toOrganization: true,
			equipmentItems: true,
			consumableItems: true
		},
		orderBy: [desc(distribution.createdAt)]
	});

	return { distributionsPromise };
};
