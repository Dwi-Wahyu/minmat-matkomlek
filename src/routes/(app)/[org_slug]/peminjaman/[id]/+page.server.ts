import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, approval, equipment, movement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/login');

	const lendingDetail = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			requestedByUser: { columns: { id: true, name: true, email: true } },
			approvedByUser: { columns: { id: true, name: true } },
			organization: true,
			items: {
				with: {
					equipment: { with: { item: true, warehouse: true } }
				}
			},
			approvals: {
				with: { approvedByUser: { columns: { id: true, name: true } } },
				orderBy: (approval, { desc }) => [desc(approval.createdAt)]
			}
		}
	});

	if (!lendingDetail) throw redirect(303, `/${org_slug._replace('.', '-')}/peminjaman`);

	// Otorisasi: Hanya PUSKOMLEKAD (parentId: null) atau atasan langsung yang bisa approve
	const canApprove = user.role === 'pimpinan' && lendingDetail.status === 'DRAFT';

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
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const note = formData.get('note')?.toString();

		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true }
			});

			await db
				.update(lending)
				.set({
					status: 'APPROVED',
					approvedBy: user.id
				})
				.where(eq(lending.id, id));

			await db.insert(approval).values({
				id: crypto.randomUUID(),
				referenceType: 'LENDING',
				referenceId: id,
				approvedBy: user.id,
				status: 'APPROVED',
				note: note || 'Disetujui'
			});

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Disetujui',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} telah disetujui.`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Peminjaman berhasil disetujui' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menyetujui peminjaman' });
		}
	},

	reject: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const reason = formData.get('reason')?.toString();

		if (!id || !reason) return fail(400, { message: 'Alasan penolakan harus diisi' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true }
			});

			await db
				.update(lending)
				.set({
					status: 'REJECTED',
					rejectedReason: reason,
					approvedBy: user.id
				})
				.where(eq(lending.id, id));

			await db.insert(approval).values({
				id: crypto.randomUUID(),
				referenceType: 'LENDING',
				referenceId: id,
				approvedBy: user.id,
				status: 'REJECTED',
				note: reason
			});

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Ditolak',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} ditolak. Alasan: ${reason}`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Peminjaman telah ditolak' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menolak peminjaman' });
		}
	},

	startLending: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id || !user) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true }
			});

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'DIPINJAM' }).where(eq(lending.id, id));
				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					await tx.update(equipment).set({ status: 'IN_USE' }).where(eq(equipment.id, item.equipmentId));

					// Catat Movement
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: item.equipmentId,
						organizationId: user.organization.id,
						eventType: 'LOAN_OUT',
						qty: 1,
						notes: `Alat dipinjam oleh unit: ${lendingData?.unit || id}`,
						picId: user.id
					});
				}
			});

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Barang Dipinjam',
					body: `Proses penyerahan barang untuk peminjaman unit ${lendingData.unit} telah selesai.`,
					priority: 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Barang berhasil dipinjam' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal memulai peminjaman' });
		}
	},

	returnLending: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id || !user) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true }
			});

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'KEMBALI' }).where(eq(lending.id, id));
				const items = await tx.query.lendingItem.findMany({ where: eq(lendingItem.lendingId, id) });

				for (const item of items) {
					await tx.update(equipment).set({ status: 'READY' }).where(eq(equipment.id, item.equipmentId));

					// Catat Movement
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: item.equipmentId,
						organizationId: user.organization.id,
						eventType: 'LOAN_RETURN',
						qty: 1,
						notes: `Alat telah dikembalikan dari peminjaman unit ${lendingData?.unit || id}`,
						picId: user.id
					});
				}
			});

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Selesai',
					body: `Barang untuk peminjaman unit ${lendingData.unit} telah dikembalikan dan diproses.`,
					priority: 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Barang telah dikembalikan' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal mengembalikan barang' });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID required' });

		try {
			await db.delete(lending).where(eq(lending.id, id));
			return { success: true };
		} catch (err) {
			return fail(500, { message: 'Gagal menghapus data' });
		}
	}
};
