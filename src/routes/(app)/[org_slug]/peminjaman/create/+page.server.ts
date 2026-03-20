import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { lending, lendingItem, equipment } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
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

export const load: PageServerLoad = async ({ locals, params }) => {
	const { org_slug } = params;

	// Ambil equipment yang tersedia (READY) di organisasi ini
	const availableEquipment = await db.query.equipment.findMany({
		where: and(eq(equipment.status, 'READY'), eq(equipment.organizationId, user.organization.id)),
		with: {
			item: true,
			warehouse: true
		},
		orderBy: (eq, { asc }) => [asc(eq.name)]
	});

	return {
		equipment: availableEquipment,
		orgSlug: org_slug
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
			const validated = lendingSchema.parse(data);

			// Validasi ketersediaan equipment
			for (const item of validated.items) {
				const equipmentAvailability = await db.query.equipment.findFirst({
					where: and(
						eq(equipment.id, item.equipmentId),
						eq(equipment.status, 'READY'),
						eq(equipment.organizationId, user.organization.id)
					)
				});

				if (!equipmentAvailability) {
					return fail(400, { message: `Equipment dengan ID ${item.equipmentId} tidak tersedia` });
				}
			}

			// Generate ID untuk lending
			const lendingId = uuidv4();

			// Insert lending
			await db.insert(lending).values({
				id: lendingId,
				organizationId: user.organization.id,
				unit: validated.unit,
				purpose: validated.purpose,
				startDate: new Date(validated.startDate),
				endDate: validated.endDate ? new Date(validated.endDate) : null,
				status: 'DRAFT',
				requestedBy: user.id,
				createdAt: new Date()
			});

			// Insert lending items
			for (const item of validated.items) {
				await db.insert(lendingItem).values({
					id: uuidv4(),
					lendingId,
					equipmentId: item.equipmentId,
					qty: item.qty
				});
			}
		} catch (err) {
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			console.error('Error creating lending:', err);
			return fail(500, { message: 'Kesalahan server internal' });
		}

		throw redirect(303, `/${locals.user?.organization.slug}/peminjaman`);
	}
};
