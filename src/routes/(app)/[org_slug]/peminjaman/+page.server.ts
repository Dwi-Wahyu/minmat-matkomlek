import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, member, organization } from '$lib/server/db/schema';
import { eq, or, desc, and, like, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const { user: currentUser } = locals;

	if (!currentUser || !currentUser.organization) {
		throw error(401, 'Unauthorized');
	}

	const { org_slug } = params;
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) throw error(404, 'Organisasi tidak ditemukan');

	const organizationId = org.id;

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || 'ALL';

	// Dapatkan semua user ID yang berada di organisasi yang sama
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

	const dipinjamFilters = isInduk
		? [eq(lending.organizationId, organizationId), eq(lending.status, 'DIPINJAM')]
		: [
				and(
					or(
						eq(lending.organizationId, organizationId),
						inArray(lending.requestedBy, orgUserIdsSubquery)
					),
					eq(lending.status, 'DIPINJAM')
				)
			];

	if (statusFilter !== 'ALL') {
		filters.push(eq(lending.status, statusFilter as any));
	}

	if (searchQuery) {
		filters.push(like(lending.unit, `%${searchQuery}%`));
	}

	// PERUBAHAN: tidak di-await, dikembalikan sebagai Promise
	const lendingListPromise = db.query.lending.findMany({
		where: and(...filters),
		with: {
			organization: true,
			requestedByUser: {
				columns: { name: true }
			}
		},
		orderBy: [desc(lending.createdAt)]
	});

	const dipinjamListPromise = db.query.lending.findMany({
		where: and(...dipinjamFilters),
		with: {
			requestedByUser: { columns: { name: true } },
			items: {
				with: {
					equipment: { with: { item: { columns: { name: true } } } }
				}
			}
		},
		orderBy: [desc(lending.endDate)]
	});

	return {
		lendingListPromise,
		dipinjamListPromise,
		filters: {
			q: searchQuery,
			status: statusFilter
		},
		isInduk,
		org_slug: params.org_slug
	};
};
