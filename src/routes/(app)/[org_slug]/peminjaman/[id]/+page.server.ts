import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, approval, equipment, movement, auditLog } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/login');

	const lendingDetail = await db.query.lending.findFirst({
		where: eq(lending.id, id),
		with: {
			requestedByUser: { columns: { id: true, name: true, email: true } },
			approvedByUser: { columns: { id: true, name: true } },
			overrideByUser: { columns: { id: true, name: true } },
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

	if (!lendingDetail) throw redirect(303, `/${org_slug.replace('.', '-')}/peminjaman`);

	// Otorisasi: 
	// 1. Hanya Satuan Pemilik (lending.organizationId) yang bisa Approve/Reject/Proses
	// 2. Tidak boleh approve/override pengajuan sendiri
	const isRequester = user.id === lendingDetail.requestedBy;
	const isLender = user.organization.id === lendingDetail.organizationId;

	const canApprove =
		isLender &&
		!isRequester &&
		(user.role === 'kakomlek' || user.role === 'pimpinan') &&
		lendingDetail.status === 'DRAFT';
	
	const canOverride = 
		isLender && 
		!isRequester && 
		user.role === 'pimpinan' && 
		lendingDetail.status === 'DRAFT';

	const canExecute = 
		isLender && 
		(lendingDetail.status === 'APPROVED' || lendingDetail.status === 'PERINTAH_LANGSUNG');
	
	const canReturn = 
		isLender && 
		lendingDetail.status === 'DIPINJAM';

	const canDelete = 
		isRequester && 
		lendingDetail.status === 'DRAFT';

	return {
		lending: lendingDetail,
		canApprove,
		canOverride,
		canExecute,
		canReturn,
		canDelete,
		orgSlug: org_slug,
		userId: user.id
	};
};

export const actions: Actions = {
	override: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const reason = formData.get('reason')?.toString();

		if (!id || !reason) return fail(400, { message: 'ID dan Alasan Override harus diisi' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true }
			});

			await db.transaction(async (tx) => {
				await tx
					.update(lending)
					.set({
						status: 'PERINTAH_LANGSUNG',
						overrideBy: user.id,
						overrideReason: reason
					})
					.where(eq(lending.id, id));

				// Insert ke tabel approval agar muncul di riwayat UI
				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[COMMAND OVERRIDE] ${reason}`
				});

				// Audit Log khusus COMMAND_OVERRIDE
				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'COMMAND_OVERRIDE',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData?.status }),
					newValue: JSON.stringify({ status: 'PERINTAH_LANGSUNG', reason: reason })
				});
			});

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman: Perintah Langsung',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} telah di-override dengan Perintah Langsung.`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${org_slug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Peminjaman berhasil di-override dengan Perintah Langsung' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal melakukan override peminjaman' });
		}
	},

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
				columns: { requestedBy: true, unit: true, status: true }
			});

			await db.transaction(async (tx) => {
				await tx
					.update(lending)
					.set({
						status: 'APPROVED',
						approvedBy: user.id
					})
					.where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: note || 'Disetujui'
				});

				// Audit Log
				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'APPROVE_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData?.status }),
					newValue: JSON.stringify({ status: 'APPROVED' })
				});
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
				columns: { requestedBy: true, unit: true, status: true }
			});

			await db.transaction(async (tx) => {
				await tx
					.update(lending)
					.set({
						status: 'REJECTED',
						rejectedReason: reason,
						approvedBy: user.id
					})
					.where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'REJECTED',
					note: reason
				});

				// Audit Log
				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'REJECT_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData?.status }),
					newValue: JSON.stringify({ status: 'REJECTED', reason })
				});
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
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'APPROVED' && lendingData?.status !== 'PERINTAH_LANGSUNG') {
				return fail(400, {
					message: 'Hanya peminjaman berstatus APPROVED atau PERINTAH_LANGSUNG yang dapat diambil'
				});
			}

			await db.transaction(async (tx) => {
				// Update status peminjaman
				await tx.update(lending).set({ status: 'DIPINJAM' }).where(eq(lending.id, id));

				// Audit Log Peminjaman
				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'START_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData.status }),
					newValue: JSON.stringify({ status: 'DIPINJAM' })
				});

				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					// VALIDASI: equipment.status HARUS = READY
					if (item.equipment.status !== 'READY') {
						throw new Error(`Alat ${item.equipment.serialNumber} tidak dalam status READY`);
					}
					// VALIDASI: equipment.condition TIDAK BOLEH RUSAK_BERAT
					if (item.equipment.condition === 'RUSAK_BERAT') {
						throw new Error(`Alat ${item.equipment.serialNumber} dalam kondisi RUSAK_BERAT`);
					}

					// Update status alat
					await tx
						.update(equipment)
						.set({ status: 'IN_USE' })
						.where(eq(equipment.id, item.equipmentId));

					// Catat Movement (WAJIB)
					await tx.insert(movement).values({
						id: uuidv4(),
						equipmentId: item.equipmentId,
						itemId: item.equipment.itemId,
						organizationId: lendingData.organizationId,
						eventType: 'LOAN_OUT',
						classification: 'KOMUNITY',
						specificLocationName: lendingData.unit,
						fromWarehouseId: item.equipment.warehouseId,
						referenceType: 'LENDING',
						referenceId: id,
						qty: 1,
						notes: `Alat dipinjam oleh unit: ${lendingData.unit}`,
						picId: user.id
					});

					// Audit Log Alat
					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'UPDATE_EQUIPMENT_STATUS',
						tableName: 'equipment',
						recordId: item.equipmentId,
						oldValue: JSON.stringify({ status: 'READY' }),
						newValue: JSON.stringify({ status: 'IN_USE' })
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
		} catch (err: any) {
			console.error(err);
			return fail(500, { message: err.message || 'Gagal memulai peminjaman' });
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
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DIPINJAM') {
				return fail(400, { message: 'Hanya peminjaman berstatus DIPINJAM yang dapat dikembalikan' });
			}

			await db.transaction(async (tx) => {
				// Update status peminjaman
				await tx.update(lending).set({ status: 'KEMBALI' }).where(eq(lending.id, id));

				// Audit Log Peminjaman
				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'RETURN_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData.status }),
					newValue: JSON.stringify({ status: 'KEMBALI' })
				});

				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					// VALIDASI: equipment.status HARUS = IN_USE
					if (item.equipment.status !== 'IN_USE') {
						throw new Error(`Alat ${item.equipment.serialNumber} tidak dalam status IN_USE`);
					}

					// Update status alat
					await tx
						.update(equipment)
						.set({ status: 'READY' })
						.where(eq(equipment.id, item.equipmentId));

					// Catat Movement (WAJIB)
					await tx.insert(movement).values({
						id: uuidv4(),
						equipmentId: item.equipmentId,
						organizationId: lendingData.organizationId,
						eventType: 'LOAN_RETURN',
						classification: 'KOMUNITY',
						specificLocationName: 'Gudang',
						referenceType: 'LENDING',
						referenceId: id,
						qty: 1,
						notes: `Alat telah dikembalikan dari peminjaman unit ${lendingData.unit}`,
						picId: user.id
					});

					// Audit Log Alat
					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'UPDATE_EQUIPMENT_STATUS',
						tableName: 'equipment',
						recordId: item.equipmentId,
						oldValue: JSON.stringify({ status: 'IN_USE' }),
						newValue: JSON.stringify({ status: 'READY' })
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
		} catch (err: any) {
			console.error(err);
			return fail(500, { message: err.message || 'Gagal mengembalikan barang' });
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
