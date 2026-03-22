import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment, organization } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { createNotification } from '$lib/server/notification';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/login');

	const targetOrgId = url.searchParams.get('targetOrgId') || user.organization.id;
	const preselectedEquipmentId = url.searchParams.get('equipmentId');

	// Ambil detail organisasi target
	const targetOrg = await db.query.organization.findFirst({
		where: eq(organization.id, targetOrgId)
	});

	if (!targetOrg) throw redirect(302, `/${user.organization.slug}/peminjaman`);

	// Ambil equipment yang tersedia (READY) di organisasi target
	const availableEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.status, 'READY'), eq(equipment.organizationId, targetOrgId)),
		with: {
			item: true,
			warehouse: true
		}
	});

	return {
		equipment: availableEquipment,
		targetOrg,
		preselectedEquipmentId,
		orgSlug: targetOrg.slug
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();

		// Parse items dari form data
		const equipmentIds = formData.getAll('equipmentId[]');
		const qtys = formData.getAll('qty[]');
		const targetOrgId = formData.get('targetOrgId')?.toString();

		if (!targetOrgId) return fail(400, { message: 'Organisasi tujuan harus ditentukan' });

		const items = equipmentIds.map((id, index) => ({
			equipmentId: id.toString(),
			qty: parseInt(qtys[index]?.toString() || '1')
		}));

		if (items.length === 0) {
			return fail(400, { message: 'Minimal 1 alat harus dipilih' });
		}

		const unit = formData.get('unit')?.toString();
		const purpose = formData.get('purpose')?.toString() as 'OPERASI' | 'LATIHAN';
		const startDateStr = formData.get('startDate')?.toString();
		const endDateStr = formData.get('endDate')?.toString();

		if (!unit || !purpose || !startDateStr) {
			return fail(400, { message: 'Data peminjaman tidak lengkap' });
		}

		try {
			const lendingId = crypto.randomUUID();

			// Insert lending
			await db.insert(lending).values({
				id: lendingId,
				organizationId: targetOrgId, // Meminjam DARI organisasi ini
				unit: unit,
				purpose: purpose,
				startDate: new Date(startDateStr),
				endDate: endDateStr ? new Date(endDateStr) : null,
				status: 'DRAFT',
				requestedBy: user.id
			});

			// Insert lending items
			for (const item of items) {
				await db.insert(lendingItem).values({
					id: crypto.randomUUID(),
					lendingId,
					equipmentId: item.equipmentId,
					qty: item.qty
				});
			}

			// Kirim notifikasi ke organisasi target (pemberi pinjaman)
			await createNotification({
				organizationId: targetOrgId,
				title: 'Pengajuan Peminjaman Baru',
				body: `Unit ${unit} mengajukan peminjaman alat untuk keperluan ${purpose}.`,
				priority: 'MEDIUM',
				action: {
					type: 'LENDING_DETAIL',
					resourceId: lendingId,
					webPath: `/${user.organization.slug}/peminjaman/${lendingId}`
				}
			});

			return { success: true, message: 'Peminjaman berhasil diajukan' };
		} catch (err) {
			console.error('Error creating lending:', err);
			return fail(500, { message: 'Gagal membuat pengajuan peminjaman' });
		}
	}
};
