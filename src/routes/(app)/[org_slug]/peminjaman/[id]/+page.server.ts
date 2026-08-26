import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	lending,
	lendingItem,
	approval,
	equipment,
	movement,
	auditLog,
	organization,
	user as userTable,
	member
} from '$lib/server/db/schema';
import { eq, or, inArray, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';

async function getOrganizationSlug(tx_or_db: any, organizationId: string): Promise<string> {
	const org = await tx_or_db.query.organization.findFirst({
		where: eq(organization.id, organizationId),
		columns: { slug: true }
	});
	return org?.slug ?? organizationId;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/');

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
		isLender && !isRequester && user.role === 'pimpinan' && lendingDetail.status === 'DRAFT';

	const isKepalaGudang = user.role === 'kepalaGudang';

	// Operator GUDANG (isLender = org pemilik alat) yang keluarkan alat
	const canDispatch =
		isLender &&
		isKepalaGudang &&
		(lendingDetail.status === 'APPROVED' || lendingDetail.status === 'PERINTAH_LANGSUNG');

	// Operator PEMINJAM (bukan isLender) yang konfirmasi terima
	const canConfirmReceive =
		!isLender && isKepalaGudang && lendingDetail.status === 'DALAM_PENGIRIMAN';

	// Operator PEMINJAM yang kirim balik
	const canSendBack = !isLender && isKepalaGudang && lendingDetail.status === 'DIPINJAM';

	// Operator GUDANG yang konfirmasi terima kembali
	const canConfirmReturn = isLender && isKepalaGudang && lendingDetail.status === 'DIKIRIM_KEMBALI';

	const canDelete = isRequester && lendingDetail.status === 'DRAFT';

	return {
		lending: lendingDetail,
		canApprove,
		canOverride,
		canDispatch,
		canConfirmReceive,
		canSendBack,
		canConfirmReturn,
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
				const requesterUser = await db.query.user.findFirst({
					where: eq(userTable.id, lendingData.requestedBy!),
					with: { members: { with: { organization: true } } }
				});
				const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;

				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman: Perintah Langsung',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} telah di-override dengan Perintah Langsung.`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
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
				const requesterUser = await db.query.user.findFirst({
					where: eq(userTable.id, lendingData.requestedBy!),
					with: { members: { with: { organization: true } } }
				});
				const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;

				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Disetujui',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} telah disetujui.`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
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

			if (!lendingData) return fail(400, { message: 'Data peminjaman tidak ditemukan' });

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

			const requesterUser = await db.query.user.findFirst({
				where: eq(userTable.id, lendingData?.requestedBy!),
				with: { members: { with: { organization: true } } }
			});

			// Cari org peminjam (bukan org pemberi)
			const requesterOrgId = requesterUser?.members?.[0]?.organizationId;
			const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;

			if (lendingData?.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Ditolak',
					body: `Permintaan peminjaman untuk unit ${lendingData.unit} ditolak. Alasan: ${reason}`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Peminjaman telah ditolak' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menolak peminjaman' });
		}
	},

	dispatch: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (!lendingData || !['APPROVED', 'PERINTAH_LANGSUNG'].includes(lendingData.status!)) {
				return fail(400, { message: 'Status peminjaman tidak valid untuk pengeluaran' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'DALAM_PENGIRIMAN' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[DALAM_PENGIRIMAN] Alat dikeluarkan dari gudang oleh: ${user.name}`
				});

				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					if (item.equipment!.status !== 'READY') {
						throw new Error(`Alat ${item.equipment!.serialNumber} tidak dalam status READY`);
					}
					if (item.equipment!.condition === 'RUSAK_BERAT') {
						throw new Error(`Alat ${item.equipment!.serialNumber} dalam kondisi RUSAK_BERAT`);
					}

					// Update status equipment
					await tx
						.update(equipment)
						.set({ status: 'IN_USE' })
						.where(eq(equipment.id, item.equipmentId!));

					// Catat LOAN_OUT — gudang asal dari equipment.warehouseId, tujuan null (unit peminjam tidak punya warehouseId)
					await tx.insert(movement).values({
						id: uuidv4(),
						equipmentId: item.equipmentId,
						itemId: item.equipment!.itemId,
						organizationId: lendingData.organizationId,
						eventType: 'LOAN_OUT',
						classification: 'KOMUNITY',
						fromWarehouseId: item.equipment!.warehouseId, // ← gudang asal otomatis dari equipment
						toWarehouseId: null, // unit peminjam tidak punya warehouseId terdaftar
						specificLocationName: lendingData.unit,
						referenceType: 'LENDING',
						referenceId: id,
						qty: '1',
						notes: `Alat dikeluarkan ke unit: ${lendingData.unit}`,
						picId: user.id
					});

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

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'DISPATCH_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: lendingData.status }),
					newValue: JSON.stringify({ status: 'DALAM_PENGIRIMAN' })
				});
			});

			// Notifikasi ke operator peminjam (organisasi peminjam)
			// Ambil organisasi peminjam dari requestedBy user
			const requesterUser = await db.query.user.findFirst({
				where: eq(userTable.id, lendingData.requestedBy!),
				with: { members: { with: { organization: true } } }
			});

			// Cari org peminjam (bukan org pemberi)
			const requesterOrgId = requesterUser?.members?.[0]?.organizationId;
			const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;

			if (requesterOrgId) {
				// Kirim notifikasi ke kepala gudang di org peminjam
				const borrowerKGMembers = await db.query.member.findMany({
					where: and(eq(member.organizationId, requesterOrgId), eq(member.role, 'kepalaGudang')),
					columns: { userId: true }
				});

				const borrowerKGs = borrowerKGMembers.map((m) => m.userId!).filter(Boolean);

				for (const kgId of borrowerKGs) {
					await createNotification({
						userId: kgId,
						title: 'Alat Siap Diterima',
						body: `Alat untuk peminjaman unit ${lendingData.unit} telah dikirim dari gudang. Mohon konfirmasi penerimaan.`,
						priority: 'HIGH',
						action: {
							type: 'LENDING_DETAIL',
							resourceId: id,
							webPath: `/${requesterOrgSlug}/peminjaman/${id}`
						}
					});
				}
			}

			// Notifikasi ke requester
			if (lendingData.requestedBy) {
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Alat Dalam Pengiriman',
					body: `Alat peminjaman untuk unit ${lendingData.unit} sedang dalam pengiriman. Konfirmasi penerimaan saat alat tiba.`,
					priority: 'HIGH',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Alat berhasil dikeluarkan dari gudang' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal mengeluarkan alat' });
		}
	},

	confirmReceive: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const notes = formData.get('notes')?.toString() || '';
		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DALAM_PENGIRIMAN') {
				return fail(400, { message: 'Status tidak valid untuk konfirmasi penerimaan' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'DIPINJAM' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[DIPINJAM] Penerimaan dikonfirmasi oleh operator: ${user.name}${notes ? '. Catatan: ' + notes : ''}`
				});

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'CONFIRM_RECEIVE_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: 'DALAM_PENGIRIMAN' }),
					newValue: JSON.stringify({ status: 'DIPINJAM', confirmedBy: user.id })
				});
			});

			// Notifikasi ke org pemberi (Puskomlekad) bahwa alat sudah diterima
			await createNotification({
				organizationId: lendingData.organizationId!,
				title: 'Alat Dikonfirmasi Diterima',
				body: `Unit ${lendingData.unit} telah mengkonfirmasi penerimaan alat.`,
				priority: 'MEDIUM',
				action: {
					type: 'LENDING_DETAIL',
					resourceId: id,
					webPath: `/${org_slug}/peminjaman/${id}`
				}
			});

			return { success: true, message: 'Penerimaan alat berhasil dikonfirmasi' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal konfirmasi penerimaan' });
		}
	},

	sendBack: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const notes = formData.get('notes')?.toString() || '';
		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DIPINJAM') {
				return fail(400, { message: 'Hanya peminjaman DIPINJAM yang dapat dikirim kembali' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'DIKIRIM_KEMBALI' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[DIKIRIM_KEMBALI] Alat dikirim kembali oleh: ${user.name}${notes ? '. Catatan: ' + notes : ''}`
				});

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'SEND_BACK_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: 'DIPINJAM' }),
					newValue: JSON.stringify({ status: 'DIKIRIM_KEMBALI' })
				});
			});

			const lenderOrgSlug = await getOrganizationSlug(db, lendingData.organizationId!);

			// 1. Notifikasi ke Operator Peminjam (Borrower) - Sebagai Konfirmasi
			if (lendingData.requestedBy) {
				const requesterUser = await db.query.user.findFirst({
					where: eq(userTable.id, lendingData.requestedBy!),
					with: { members: { with: { organization: true } } }
				});
				const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;
				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Alat Dikirim Kembali — Perlu Konfirmasi',
					body: `Unit ${lendingData.unit} telah mengirimkan kembali alat. Konfirmasi penerimaan di gudang diperlukan.`,
					priority: 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
					}
				});
			}

			// 2. Notifikasi ke Operator & Pimpinan Puskomlekad (Lender)
			const lenderMembers = await db.query.member.findMany({
				where: and(
					eq(member.organizationId, lendingData.organizationId!),
					inArray(member.role, ['pimpinan', 'kakomlek', 'kepalaGudang'])
				)
			});

			const lenderUserIds = lenderMembers.map((m) => m.userId!).filter(Boolean);

			if (lenderUserIds.length > 0) {
				const lenderStaff = await db.query.user.findMany({
					where: inArray(userTable.id, lenderUserIds)
				});

				for (const staff of lenderStaff) {
					const memberRecord = lenderMembers.find((m) => m.userId === staff.id);
					if (!memberRecord) continue;

					// Hanya kirim notifikasi ke kepalaGudang jika warehouseHeadType === 'KOMUNITY'
					if (
						memberRecord.role === 'kepalaGudang' &&
						memberRecord.warehouseHeadType !== 'KOMUNITY'
					) {
						continue;
					}

					let title = '';
					let body = '';
					let priority: 'HIGH' | 'MEDIUM' = 'MEDIUM';

					if (memberRecord.role === 'pimpinan' || memberRecord.role === 'kakomlek') {
						title = 'Pemberitahuan Pengembalian Alat';
						body = `Unit ${lendingData.unit} telah mengirimkan kembali alat peminjaman. Menunggu konfirmasi gudang.`;
					} else {
						title = 'Alat Dikirim Kembali — Perlu Konfirmasi';
						body = `Unit ${lendingData.unit} telah mengirimkan kembali alat. Mohon konfirmasi penerimaan di gudang.`;
						priority = 'HIGH';
					}

					await createNotification({
						userId: staff.id,
						title,
						body,
						priority,
						action: {
							type: 'LENDING_DETAIL',
							resourceId: id,
							webPath: `/${lenderOrgSlug}/peminjaman/${id}`
						}
					});
				}
			}

			return { success: true, message: 'Alat berhasil dikirim kembali' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal mengirim kembali alat' });
		}
	},

	confirmReturn: async ({ request, locals, params }) => {
		const { user } = locals;
		const { org_slug } = params;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const notes = formData.get('notes')?.toString() || '';
		// conditionOverrides: JSON string array [{equipmentId, condition}] untuk alat yang kondisinya berubah
		const conditionOverridesRaw = formData.get('conditionOverrides')?.toString();
		const conditionOverrides: { equipmentId: string; condition: string }[] = conditionOverridesRaw
			? JSON.parse(conditionOverridesRaw)
			: [];

		if (!id) return fail(400, { message: 'ID required' });

		try {
			const lendingData = await db.query.lending.findFirst({
				where: eq(lending.id, id),
				columns: { requestedBy: true, unit: true, status: true, organizationId: true }
			});

			if (lendingData?.status !== 'DIKIRIM_KEMBALI') {
				return fail(400, { message: 'Status tidak valid untuk konfirmasi pengembalian' });
			}

			await db.transaction(async (tx) => {
				await tx.update(lending).set({ status: 'KEMBALI' }).where(eq(lending.id, id));

				await tx.insert(approval).values({
					id: uuidv4(),
					referenceType: 'LENDING',
					referenceId: id,
					approvedBy: user.id,
					status: 'APPROVED',
					note: `[KEMBALI] Pengembalian dikonfirmasi oleh: ${user.name}${notes ? '. Catatan: ' + notes : ''}`
				});

				const items = await tx.query.lendingItem.findMany({
					where: eq(lendingItem.lendingId, id),
					with: { equipment: true }
				});

				for (const item of items) {
					// Cek apakah ada override kondisi untuk alat ini
					const override = conditionOverrides.find((o) => o.equipmentId === item.equipmentId);
					const finalCondition = override?.condition ?? item.equipment!.condition;

					// Kembalikan status ke READY
					await tx
						.update(equipment)
						.set({
							status: 'READY',
							condition: finalCondition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT'
						})
						.where(eq(equipment.id, item.equipmentId!));

					// Catat LOAN_RETURN — gudang tujuan adalah warehouseId asal equipment
					await tx.insert(movement).values({
						id: uuidv4(),
						equipmentId: item.equipmentId,
						itemId: item.equipment!.itemId,
						organizationId: lendingData.organizationId,
						eventType: 'LOAN_RETURN',
						classification: 'KOMUNITY',
						fromWarehouseId: null, // unit peminjam tidak punya warehouseId
						toWarehouseId: item.equipment!.warehouseId, // ← kembali ke gudang asal equipment
						specificLocationName: lendingData.unit,
						referenceType: 'LENDING',
						referenceId: id,
						qty: '1',
						conditionAtArrival: finalCondition,
						notes: `Alat dikembalikan dari unit: ${lendingData.unit}${notes ? '. Catatan: ' + notes : ''}`,
						picId: user.id
					});

					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'UPDATE_EQUIPMENT_STATUS',
						tableName: 'equipment',
						recordId: item.equipmentId,
						oldValue: JSON.stringify({ status: 'IN_USE', condition: item.equipment!.condition }),
						newValue: JSON.stringify({ status: 'READY', condition: finalCondition })
					});
				}

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'CONFIRM_RETURN_LENDING',
					tableName: 'lending',
					recordId: id,
					oldValue: JSON.stringify({ status: 'DIKIRIM_KEMBALI' }),
					newValue: JSON.stringify({ status: 'KEMBALI' })
				});
			});

			if (lendingData.requestedBy) {
				const requesterUser = await db.query.user.findFirst({
					where: eq(userTable.id, lendingData.requestedBy!),
					with: { members: { with: { organization: true } } }
				});
				const requesterOrgSlug = requesterUser?.members?.[0]?.organization?.slug ?? org_slug;

				await createNotification({
					userId: lendingData.requestedBy,
					title: 'Peminjaman Selesai',
					body: `Pengembalian alat untuk unit ${lendingData.unit} telah dikonfirmasi oleh gudang.`,
					priority: 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: id,
						webPath: `/${requesterOrgSlug}/peminjaman/${id}`
					}
				});
			}

			return { success: true, message: 'Pengembalian alat berhasil dikonfirmasi' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal konfirmasi pengembalian' });
		}
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID required' });

		try {
			await db.delete(lending).where(eq(lending.id, id));
			return { success: true };
		} catch {
			return fail(500, { message: 'Gagal menghapus data' });
		}
	}
};
