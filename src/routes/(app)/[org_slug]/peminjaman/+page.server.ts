import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, user, organization } from '$lib/server/db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { user } = locals;
	const { org_slug } = params;

	if (!user) {
		throw new Error('User tidak ditemukan');
	}

	const organizationId = user.organization.id;
	const isParentOrg = user.organization.parentId === null;

	let lendingList;

	if (isParentOrg) {
		// Organization induk: lihat semua peminjaman dari organisasi ini dan child-nya
		// Ambil semua child organizations
		const childOrgs = await db.query.organization.findMany({
			where: (org, { eq }) => eq(org.parentId, organizationId),
			columns: { id: true }
		});

		const orgIds = [organizationId, ...childOrgs.map((org) => org.id)];

		lendingList = await db.query.lending.findMany({
			where: (lending, { inArray }) => inArray(lending.organizationId, orgIds),
			with: {
				requestedByUser: {
					columns: { id: true, name: true }
				},
				approvedByUser: {
					columns: { id: true, name: true }
				},
				organization: {
					columns: { id: true, name: true, slug: true }
				},
				items: {
					with: {
						equipment: {
							columns: { id: true, name: true, serialNumber: true }
						}
					}
				}
			},
			orderBy: [desc(lending.createdAt)]
		});
	} else {
		// Organization child: hanya lihat peminjaman dari organisasi sendiri
		lendingList = await db.query.lending.findMany({
			where: eq(lending.organizationId, organizationId),
			with: {
				requestedByUser: {
					columns: { id: true, name: true }
				},
				approvedByUser: {
					columns: { id: true, name: true }
				},
				organization: {
					columns: { id: true, name: true, slug: true }
				},
				items: {
					with: {
						equipment: {
							columns: { id: true, name: true, serialNumber: true }
						}
					}
				}
			},
			orderBy: [desc(lending.createdAt)]
		});
	}

	return {
		lending: lendingList,
		isParentOrg,
		orgSlug: org_slug
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			// Cek apakah peminjaman ada dan user memiliki akses
			const existing = await db.query.lending.findFirst({
				where: and(eq(lending.id, id), eq(lending.organizationId, user.organization.id))
			});

			if (!existing) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			// Hanya bisa hapus jika status DRAFT
			if (existing.status !== 'DRAFT') {
				return fail(400, { message: 'Hanya peminjaman dengan status DRAFT yang dapat dihapus' });
			}

			await db.delete(lending).where(eq(lending.id, id));
		} catch (err) {
			console.error('Error deleting lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	}
};
