import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, organization } from '$lib/server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import type { PageServerLoad, Actions } from './$types';
import { superValidate, message } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { lendingMutationSchema } from '$lib/schemas/lending-mutation-schema';
import fs from 'fs';
import path from 'path';

// Format tanggal untuk input datetime-local to ISO for superforms initial data
const formatDateForISO = (date: Date | null): string | undefined => {
	if (!date) return undefined;
	return new Date(date).toISOString();
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user || !user.organization) {
		throw error(401, 'Unauthorized');
	}

	const lendingData = await db.query.lending.findFirst({
		where: and(
			eq(lending.id, id),
			or(eq(lending.organizationId, user.organization.id), eq(lending.requestedBy, user.id))
		),
		with: {
			organization: true,
			requestedByUser: true,
			items: {
				with: {
					equipment: {
						with: {
							item: true,
							warehouse: true
						}
					}
				}
			}
		}
	});

	if (!lendingData) {
		throw error(404, { message: 'Peminjaman tidak ditemukan' });
	}

	// Cek apakah status masih DRAFT dan user adalah pemohon
	if (lendingData.status !== 'DRAFT' || lendingData.requestedBy !== user.id) {
		throw redirect(303, `/${org_slug}/peminjaman/${id}`);
	}

	const targetOrgId = lendingData.organizationId;
	const targetOrg = await db.query.organization.findFirst({
		where: eq(organization.id, targetOrgId!)
	});

	// Prepare pre-selected equipment IDs
	const manualEquipmentIds = lendingData.items.map((item) => item.equipmentId!).filter(Boolean);

	const initialData = {
		targetOrgId: targetOrgId!,
		unit: lendingData.unit,
		purpose: lendingData.purpose,
		overrideReason: lendingData.overrideReason || '',
		startDate: formatDateForISO(lendingData.startDate)!,
		endDate: formatDateForISO(lendingData.endDate),
		manualEquipmentIds: manualEquipmentIds
	};

	const form = await superValidate(initialData, yup(lendingMutationSchema));

	return {
		form,
		lending: lendingData,
		targetOrg,
		orgSlug: user.organization.slug,
		preselectedEquipmentIds: manualEquipmentIds
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { id } = params;
		const { user } = locals;

		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();
		const form = await superValidate(formData, yup(lendingMutationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Parse data grup & manual pick
		const itemIds = formData.getAll('itemId[]');
		const warehouseIds = formData.getAll('warehouseId[]');
		const conditions = formData.getAll('condition[]');
		const qtys = formData.getAll('qty[]');
		const manualEquipmentIds = formData.getAll('manualEquipmentId[]').map((id) => id.toString());

		const targetOrgId = form.data.targetOrgId;

		if (!targetOrgId) return message(form, 'Organisasi tujuan harus ditentukan', { status: 400 });

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

		const attachment = formData.get('attachment') as File;
		let attachmentPath = null;
		let attachmentName = null;

		if (attachment && attachment.size > 0) {
			const ext = path.extname(attachment.name).toLowerCase();
			if (ext !== '.pdf' && ext !== '.docx') {
				return message(form, 'Hanya file PDF atau DOCX yang diperbolehkan', { status: 400 });
			}
			if (attachment.size > 5 * 1024 * 1024) {
				return message(form, 'Ukuran file maksimal 5MB', { status: 400 });
			}

			const fileName = `${uuidv4()}${ext}`;
			const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'lending');
			if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

			const filePath = path.join(uploadDir, fileName);
			const arrayBuffer = await attachment.arrayBuffer();
			fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

			attachmentPath = `/uploads/lending/${fileName}`;
			attachmentName = attachment.name;
		}

		try {
			// Validate existence and permissions
			const existingLending = await db.query.lending.findFirst({
				where: and(
					eq(lending.id, id),
					or(eq(lending.organizationId, user.organization.id), eq(lending.requestedBy, user.id))
				)
			});

			if (!existingLending)
				return message(form, 'Data peminjaman tidak ditemukan', { status: 404 });
			if (existingLending.status !== 'DRAFT')
				return message(form, 'Hanya peminjaman dengan status DRAFT yang dapat diedit', {
					status: 400
				});
			if (existingLending.requestedBy !== user.id)
				return message(form, 'Anda tidak memiliki izin untuk mengedit peminjaman ini', {
					status: 403
				});

			await db.transaction(async (tx) => {
				const isOverride = form.data.purpose === 'PERINTAH_LANGSUNG';

				// Update lending
				const updateValues: any = {
					unit: form.data.unit,
					purpose: form.data.purpose,
					startDate: new Date(form.data.startDate),
					endDate: form.data.endDate ? new Date(form.data.endDate) : null,
					overrideReason: isOverride ? form.data.overrideReason : null,
					status: isOverride ? 'PERINTAH_LANGSUNG' : 'DRAFT'
				};

				if (attachmentPath) {
					updateValues.attachmentPath = attachmentPath;
					updateValues.attachmentName = attachmentName;
				}

				await tx.update(lending).set(updateValues).where(eq(lending.id, id));

				// Hapus semua lending item yang lama
				await tx.delete(lendingItem).where(eq(lendingItem.lendingId, id));

				// 1. Proses Manual Selection
				for (const eqId of manualEquipmentIds) {
					const eqp = await tx.query.equipment.findFirst({
						where: and(eq(equipment.id, eqId), eq(equipment.organizationId, targetOrgId))
					});
					if (!eqp) throw new Error(`Alat dengan ID ${eqId} tidak ditemukan atau tidak tersedia`);

					await tx.insert(lendingItem).values({
						id: uuidv4(),
						lendingId: id,
						equipmentId: eqId
					});
				}

				// 2. Proses Auto-pick by Quantity
				for (const group of requestedGroups) {
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

					for (const eqp of availableEqs) {
						await tx.insert(lendingItem).values({
							id: uuidv4(),
							lendingId: id,
							equipmentId: eqp.id
						});
					}
				}
			});

			return message(form, 'Perubahan peminjaman berhasil disimpan');
		} catch (err) {
			console.error('Error updating lending:', err);
			return message(form, ((err as any).message as string) || 'Kesalahan server internal', {
				status: 500
			});
		}
	}
};
