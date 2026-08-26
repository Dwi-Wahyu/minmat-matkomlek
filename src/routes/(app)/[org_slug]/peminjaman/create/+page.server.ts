import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	lending,
	lendingItem,
	equipment,
	organization,
	auditLog,
	member
} from '$lib/server/db/schema';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { lendingMutationSchema } from '$lib/schemas/lending-mutation-schema';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = locals;
	if (!user || !user.organization) throw redirect(302, '/');

	const targetOrgId = url.searchParams.get('targetOrgId');
	const preselectedEquipmentId = url.searchParams.get('equipmentId');

	// Identifikasi Satuan Induk (Puskomlekad)
	const parentOrg = await db.query.organization.findFirst({
		where: isNull(organization.parentId)
	});

	if (user.organization.parentId && !targetOrgId && parentOrg) {
		throw redirect(302, `?targetOrgId=${parentOrg.id}`);
	}

	let allowedOrganizations: any[] = [];

	if (user.organization.parentId) {
		// User adalah satuan jajaran (anak)
		// Hanya boleh meminjam dari Satuan Induk
		if (parentOrg) {
			allowedOrganizations = [parentOrg];
		}
	} else {
		// User adalah Satuan Induk
		// Boleh meminjam dari satuan jajaran (anak-anaknya)
		allowedOrganizations = await db.query.organization.findMany({
			where: eq(organization.parentId, user.organization.id)
		});
	}

	let targetOrg = null;

	if (targetOrgId) {
		// Validasi: target harus ada dalam daftar yang diperbolehkan
		const isAllowed = allowedOrganizations.some((org) => org.id === targetOrgId);

		if (isAllowed) {
			// Ambil detail organisasi target
			targetOrg = await db.query.organization.findFirst({
				where: eq(organization.id, targetOrgId)
			});
		} else if (user.organization.parentId && parentOrg) {
			// Jika anak mencoba meminjam dari selain induk, redirect ke induk
			throw redirect(302, `?targetOrgId=${parentOrg.id}`);
		}
	}

	const form = await superValidate(yup(lendingMutationSchema));

	return {
		form,
		groupedEquipment: [],
		targetOrg,
		organizations: allowedOrganizations,
		preselectedEquipmentId,
		orgSlug: user.organization.slug
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const form = await superValidate(formData, yup(lendingMutationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { user } = locals;

		// Parse data grup & manual pick (these might not map perfectly via superforms due to the array bracket naming convention in the original HTML)
		const itemIds = formData.getAll('itemId[]');
		const warehouseIds = formData.getAll('warehouseId[]');
		const conditions = formData.getAll('condition[]');
		const qtys = formData.getAll('qty[]');
		const manualEquipmentIds = formData.getAll('manualEquipmentId[]').map((id) => id.toString());

		const targetOrgId = form.data.targetOrgId;

		if (!targetOrgId) return message(form, 'Organisasi tujuan harus ditentukan', { status: 400 });

		const targetOrg = await db.query.organization.findFirst({
			where: eq(organization.id, targetOrgId)
		});

		if (!targetOrg) return message(form, 'Organisasi tujuan tidak ditemukan', { status: 400 });

		const isUserParent = !user.organization.parentId;
		const isTargetParent = !targetOrg.parentId;

		if (isUserParent === isTargetParent) {
			return message(
				form,
				'Peminjaman hanya diperbolehkan antara satuan jajaran dan satuan induk',
				{ status: 400 }
			);
		}

		if (targetOrgId === user.organization.id) {
			return message(form, 'Tidak dapat meminjam dari organisasi sendiri', { status: 400 });
		}

		// Group requests (Auto-pick)
		const requestedGroups = itemIds
			.map((id, index) => ({
				itemId: id.toString(),
				warehouseId: warehouseIds[index]?.toString(),
				condition: conditions[index]?.toString() as any,
				qty: parseInt(qtys[index]?.toString() || '0')
			}))
			.filter((g) => g.qty > 0);

		if (requestedGroups.length === 0 && manualEquipmentIds.length === 0) {
			return message(form, 'Minimal 1 alat harus dipilih', { status: 400 });
		}

		const unit = form.data.unit;
		const purpose = form.data.purpose as 'OPERASI' | 'LATIHAN' | 'PERINTAH_LANGSUNG';
		const startDateStr = form.data.startDate;
		const endDateStr = form.data.endDate;
		const overrideReason = form.data.overrideReason;
		const attachment = formData.get('attachment') as File;

		// Handle file upload
		let attachmentPath = null;
		let attachmentName = null;

		if (attachment && attachment.size > 0) {
			const ext = path.extname(attachment.name).toLowerCase();
			if (ext !== '.pdf' && ext !== '.docx') {
				return message(form, 'Hanya file PDF atau DOCX yang diperbolehkan', { status: 400 });
			}

			// Maks 5MB
			if (attachment.size > 5 * 1024 * 1024) {
				return message(form, 'Ukuran file maksimal 5MB', { status: 400 });
			}

			const fileName = `${uuidv4()}${ext}`;
			const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'lending');

			if (!fs.existsSync(uploadDir)) {
				fs.mkdirSync(uploadDir, { recursive: true });
			}

			const filePath = path.join(uploadDir, fileName);
			const arrayBuffer = await attachment.arrayBuffer();
			fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

			attachmentPath = `/uploads/lending/${fileName}`;
			attachmentName = attachment.name;
		}

		try {
			const lendingId = uuidv4();
			const isOverride = purpose === 'PERINTAH_LANGSUNG';

			await db.transaction(async (tx) => {
				// Insert lending
				await tx.insert(lending).values({
					id: lendingId,
					organizationId: targetOrgId,
					unit: unit,
					purpose: purpose,
					startDate: new Date(startDateStr),
					endDate: endDateStr ? new Date(endDateStr) : null,
					status: isOverride ? 'PERINTAH_LANGSUNG' : 'DRAFT',
					overrideBy: isOverride ? user.id : null,
					overrideReason: isOverride ? overrideReason : null,
					attachmentPath: attachmentPath,
					attachmentName: attachmentName,
					requestedBy: user.id
				});

				// 1. Proses Manual Selection (Specific Equipment IDs)
				for (const eqId of manualEquipmentIds) {
					// Validasi status READY
					const eqp = await tx.query.equipment.findFirst({
						where: and(eq(equipment.id, eqId), eq(equipment.status, 'READY'))
					});

					if (!eqp) throw new Error(`Alat dengan ID ${eqId} tidak tersedia atau sudah dipinjam`);

					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId,
						equipmentId: eqId
					});
				}

				// 2. Proses Auto-pick by Quantity (Group Selection)
				for (const group of requestedGroups) {
					// Cari ID equipment yang READY sesuai kriteria
					const availableEqs = await tx.query.equipment.findMany({
						where: and(
							eq(equipment.itemId, group.itemId),
							eq(equipment.organizationId, targetOrgId),
							eq(equipment.warehouseId, group.warehouseId),
							eq(equipment.condition, group.condition),
							eq(equipment.status, 'READY')
						),
						limit: group.qty,
						columns: { id: true }
					});

					if (availableEqs.length < group.qty) {
						throw new Error(`Stok alat tidak mencukupi untuk item kriteria tertentu`);
					}

					// Insert lending items untuk setiap equipment ID yang ditemukan
					for (const eqp of availableEqs) {
						await tx.insert(lendingItem).values({
							id: uuidv4(),
							lendingId,
							equipmentId: eqp.id
						});
					}
				}

				if (isOverride) {
					await tx.insert(auditLog).values({
						id: uuidv4(),
						userId: user.id,
						action: 'COMMAND_OVERRIDE',
						tableName: 'lending',
						recordId: lendingId,
						newValue: JSON.stringify({
							status: 'PERINTAH_LANGSUNG',
							purpose: 'PERINTAH_LANGSUNG',
							reason: overrideReason
						})
					});
				}
			});

			// Ambil detail organisasi parent untuk slug notifikasi
			const parentOrg = await db.query.organization.findFirst({
				where: eq(organization.id, user.organization.parentId || '')
			});

			// Ambil member dari organisasi pemberi pinjaman yang memiliki role pimpinan, kakomlek, atau kepalaGudang
			const targetMembers = await db.query.member.findMany({
				where: and(
					eq(member.organizationId, targetOrgId),
					inArray(member.role, ['pimpinan', 'kakomlek', 'kepalaGudang'])
				)
			});

			for (const tm of targetMembers) {
				if (!tm.userId) continue;

				// Jika pengajuan biasa (butuh approval), hanya kirim ke pimpinan dan kakomlek
				if (!isOverride && tm.role === 'kepalaGudang') {
					continue;
				}

				// Jika kepalaGudang, hanya kirim jika warehouseHeadType === 'KOMUNITY'
				if (tm.role === 'kepalaGudang' && tm.warehouseHeadType !== 'KOMUNITY') {
					continue;
				}

				await createNotification({
					userId: tm.userId,
					title: isOverride ? 'Perintah Langsung Peminjaman' : 'Pengajuan Peminjaman Baru',
					body: isOverride
						? `Unit ${unit} melakukan peminjaman darurat (Perintah Langsung).`
						: `Unit ${unit} mengajukan peminjaman alat untuk keperluan ${purpose}.`,
					priority: isOverride ? 'HIGH' : 'MEDIUM',
					action: {
						type: 'LENDING_DETAIL',
						resourceId: lendingId,
						webPath: `/${parentOrg?.slug || user.organization.slug}/peminjaman/${lendingId}`
					}
				});
			}

			return message(form, 'Peminjaman berhasil diajukan');
		} catch (err) {
			console.error('Error creating lending:', err);
			return message(form, 'Gagal membuat pengajuan peminjaman', { status: 500 });
		}
	}
};
