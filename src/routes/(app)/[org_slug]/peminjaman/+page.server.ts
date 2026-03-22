import { db } from '$lib/server/db';
import { lending, organization, user } from '$lib/server/db/schema';
import { eq, or, desc, and, like } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { org_slug } = params;
	const { user: currentUser } = locals;

	if (!currentUser) return { status: 401 };

	const searchQuery = url.searchParams.get('q') || '';
	const statusFilter = url.searchParams.get('status') || 'ALL';

	// Query peminjaman dimana organisasi user adalah:
	// 1. Pemohon (requestedBy adalah user ini atau organisasi peminjam adalah organisasi ini)
	// 2. Pemberi pinjaman (organizationId adalah organisasi ini)
	
	const filters = [
		or(
			eq(lending.organizationId, currentUser.organization.id),
			eq(lending.requestedBy, currentUser.id)
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
		filters: { q: searchQuery, status: statusFilter }
	};
};
