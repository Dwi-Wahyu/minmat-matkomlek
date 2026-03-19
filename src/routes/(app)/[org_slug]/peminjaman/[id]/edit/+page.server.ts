import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

const lendingItemSchema = z.object({
	equipmentId: z.string().uuid(),
	qty: z.number().int().min(1).default(1)
});

const lendingSchema = z.object({
	unit: z.string().min(1),
	purpose: z.enum(['OPERASI', 'LATIHAN']),
	startDate: z.string().datetime(),
	endDate: z.string().datetime().optional().nullable(),
	items: z.array(lendingItemSchema).min(1, 'Minimal 1 item harus dipilih')
});

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) {
		throw new Error('User tidak ditemukan');
	}

	// Ambil data peminjaman
	const lendingData = await db.query.lending.findFirst({
		where: and(eq(lending.id, id), eq(lending.organizationId, user.organization.id)),
		with: {
			items: {
				with: {
					equipment: true
				}
			}
		}
	});

	if (!lendingData) {
		throw redirect(303, `/${org_slug}/peminjaman`);
	}

	// Cek apakah status masih DRAFT dan user adalah pemohon
	if (lendingData.status !== 'DRAFT' || lendingData.requestedBy !== user.id) {
		throw redirect(303, `/${org_slug}/peminjaman/${id}`);
	}

	// Format tanggal untuk input datetime-local
	const formatDateForInput = (date: Date | null): string => {
		if (!date) return '';
		return new Date(date).toISOString().slice(0, 16);
	};

	// Ambil semua equipment yang tersedia di organisasi ini
	const availableEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.status, 'READY'), eq(equipment.organizationId, user.organization.id)),
		with: {
			item: true,
			warehouse: true
		},
		orderBy: (eq, { asc }) => [asc(eq.name)]
	});

	// Tandai equipment mana yang sudah dipilih dalam peminjaman ini
	const selectedEquipmentIds = lendingData.items.map((item) => item.equipmentId);

	const equipmentWithSelection = availableEquipment.map((eq) => ({
		...eq,
		isSelected: selectedEquipmentIds.includes(eq.id),
		selectedQty: lendingData.items.find((item) => item.equipmentId === eq.id)?.qty || 1
	}));

	return {
		lending: {
			...lendingData,
			startDate: formatDateForInput(lendingData.startDate),
			endDate: formatDateForInput(lendingData.endDate)
		},
		equipment: equipmentWithSelection,
		orgSlug: org_slug,
		selectedEquipmentIds
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { id } = params;
		const { user } = locals;

		if (!user) return fail(401, { message: 'Unauthorized' });

		const formData = await request.formData();

		// Parse items dari form data
		const equipmentIds = formData.getAll('equipmentId[]');
		const qtys = formData.getAll('qty[]');

		const items = equipmentIds.map((id, index) => ({
			equipmentId: id.toString(),
			qty: parseInt(qtys[index]?.toString() || '1')
		}));

		const data = {
			unit: formData.get('unit')?.toString(),
			purpose: formData.get('purpose')?.toString(),
			startDate: formData.get('startDate')?.toString(),
			endDate: formData.get('endDate')?.toString() || null,
			items
		};

		try {
			// Validasi data
			const validated = lendingSchema.parse(data);

			// Cek apakah peminjaman masih DRAFT dan user adalah pemohon
			const existingLending = await db.query.lending.findFirst({
				where: and(eq(lending.id, id), eq(lending.organizationId, user.organization.id))
			});

			if (!existingLending) {
				return fail(404, { message: 'Data peminjaman tidak ditemukan' });
			}

			if (existingLending.status !== 'DRAFT') {
				return fail(400, { message: 'Hanya peminjaman dengan status DRAFT yang dapat diedit' });
			}

			if (existingLending.requestedBy !== user.id) {
				return fail(403, { message: 'Anda tidak memiliki izin untuk mengedit peminjaman ini' });
			}

			// Validasi ketersediaan equipment
			for (const item of validated.items) {
				const eq = await db.query.equipment.findFirst({
					where: and(
						equipment.id,
						item.equipmentId,
						eq(equipment.status, 'READY'),
						eq(equipment.organizationId, user.organization.id)
					)
				});

				// Jika equipment tidak tersedia, cek apakah equipment tersebut sudah ada di peminjaman ini
				if (!eq) {
					const existingItem = await db.query.lendingItem.findFirst({
						where: and(eq(lendingItem.lendingId, id), eq(lendingItem.equipmentId, item.equipmentId))
					});

					if (!existingItem) {
						return fail(400, { message: `Equipment dengan ID ${item.equipmentId} tidak tersedia` });
					}
				}
			}

			// Update lending
			await db
				.update(lending)
				.set({
					unit: validated.unit,
					purpose: validated.purpose,
					startDate: new Date(validated.startDate),
					endDate: validated.endDate ? new Date(validated.endDate) : null,
					updatedAt: new Date()
				})
				.where(eq(lending.id, id));

			// Hapus semua lending item yang lama
			await db.delete(lendingItem).where(eq(lendingItem.lendingId, id));

			// Insert lending items yang baru
			for (const item of validated.items) {
				await db.insert(lendingItem).values({
					id: uuidv4(),
					lendingId: id,
					equipmentId: item.equipmentId,
					qty: item.qty
				});
			}
		} catch (err) {
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			console.error('Error updating lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		throw redirect(303, `/${user.organization.slug}/peminjaman/${id}`);
	}
};
