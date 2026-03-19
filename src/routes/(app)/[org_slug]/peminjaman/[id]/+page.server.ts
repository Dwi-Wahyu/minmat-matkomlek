import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, approval, equipment } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) {
		throw new Error('User tidak ditemukan');
	}

	// Ambil detail peminjaman
	const lendingDetail = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			requestedByUser: {
				columns: { id: true, name: true, email: true }
			},
			approvedByUser: {
				columns: { id: true, name: true }
			},
			organization: true,
			items: {
				with: {
					equipment: {
						with: {
							item: true,
							warehouse: true
						}
					}
				}
			},
			approvals: {
				with: {
					approvedByUser: {
						columns: { id: true, name: true }
					}
				},
				orderBy: (approval, { desc }) => [desc(approval.createdAt)]
			}
		}
	});

	if (!lendingDetail) {
		throw redirect(303, `/${org_slug}/peminjaman`);
	}

	// Cek apakah user memiliki akses untuk approve (hanya parent organization)
	const canApprove = user.organization.parentId === null && lendingDetail.status === 'DRAFT';

	return {
		lending: lendingDetail,
		canApprove,
		orgSlug: org_slug,
		userId: user.id
	};
};

export const actions: Actions = {
	approve: async ({ request, locals, params }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		// Cek apakah user adalah parent organization
		if (user.organization.parentId !== null) {
			return fail(403, { message: 'Hanya organisasi induk yang dapat menyetujui' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const note = formData.get('note')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			// Cek apakah peminjaman ada
			const existing = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			if (existing.status !== 'DRAFT') {
				return fail(400, { message: 'Hanya peminjaman dengan status DRAFT yang dapat disetujui' });
			}

			// Update status lending menjadi APPROVED
			await db
				.update(lending)
				.set({
					status: 'APPROVED',
					approvedBy: user.id
				})
				.where(eq(lending.id, id));

			// Buat record approval
			await db.insert(approval).values({
				id: uuidv4(),
				referenceType: 'LENDING',
				referenceId: id,
				approvedBy: user.id,
				status: 'APPROVED',
				note: note || null,
				createdAt: new Date()
			});
		} catch (err) {
			console.error('Error approving lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	},

	reject: async ({ request, locals, params }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		// Cek apakah user adalah parent organization
		if (user.organization.parentId !== null) {
			return fail(403, { message: 'Hanya organisasi induk yang dapat menolak' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const note = formData.get('note')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		if (!note) {
			return fail(400, { message: 'Alasan penolakan harus diisi' });
		}

		try {
			// Cek apakah peminjaman ada
			const existing = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			if (existing.status !== 'DRAFT') {
				return fail(400, { message: 'Hanya peminjaman dengan status DRAFT yang dapat ditolak' });
			}

			// Update status lending menjadi REJECTED
			await db
				.update(lending)
				.set({
					approvedBy: user.id
				})
				.where(eq(lending.id, id));

			// Buat record approval
			await db.insert(approval).values({
				id: uuidv4(),
				referenceType: 'LENDING',
				referenceId: id,
				approvedBy: user.id,
				status: 'REJECTED',
				note: note,
				createdAt: new Date()
			});
		} catch (err) {
			console.error('Error rejecting lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	},

	// Action untuk mengubah status menjadi DIPINJAM (setelah barang diambil)
	startLending: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			const existing = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			if (existing.status !== 'APPROVED') {
				return fail(400, { message: 'Hanya peminjaman yang sudah disetujui yang dapat dimulai' });
			}

			// Update status menjadi DIPINJAM
			await db
				.update(lending)
				.set({
					status: 'DIPINJAM'
				})
				.where(eq(lending.id, id));

			// TODO: Update status equipment menjadi IN_USE
			const items = await db.query.lendingItem.findMany({
				where: eq(lendingItem.lendingId, id)
			});

			for (const item of items) {
				await db
					.update(equipment)
					.set({ status: 'IN_USE' })
					.where(eq(equipment.id, item.equipmentId));
			}
		} catch (err) {
			console.error('Error starting lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	},

	// Action untuk mengubah status menjadi KEMBALI (setelah barang dikembalikan)
	returnLending: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			const existing = await db.query.lending.findFirst({
				where: eq(lending.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			if (existing.status !== 'DIPINJAM') {
				return fail(400, {
					message: 'Hanya peminjaman dengan status DIPINJAM yang dapat dikembalikan'
				});
			}

			// Update status menjadi KEMBALI
			await db
				.update(lending)
				.set({
					status: 'KEMBALI'
				})
				.where(eq(lending.id, id));

			// TODO: Update status equipment kembali menjadi READY
			const items = await db.query.lendingItem.findMany({
				where: eq(lendingItem.lendingId, id)
			});

			for (const item of items) {
				await db
					.update(equipment)
					.set({ status: 'READY' })
					.where(eq(equipment.id, item.equipmentId));
			}
		} catch (err) {
			console.error('Error returning lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	}
};
