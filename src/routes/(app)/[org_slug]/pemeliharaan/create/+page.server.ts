import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance, user } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';

const maintenanceSchema = z.object({
	equipmentId: z.string().uuid(),
	maintenanceType: z.enum(['PERAWATAN', 'PERBAIKAN']),
	description: z.string().min(1),
	scheduledDate: z.string().datetime(),
	completionDate: z.string().datetime().optional().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: z.string().uuid().optional().nullable()
});

export const load: PageServerLoad = async ({ locals }) => {
	const { user: loggedInUser } = locals;

	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, loggedInUser.organization.id),
		columns: { id: true, serialNumber: true },
		with: {
			item: {
				columns: {
					name: true
				}
			}
		}
	});

	const technicianList = await db.query.user.findMany({
		where: eq(user.id, loggedInUser.organization.id),
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	return { equipment: equipmentList, technicians: technicianList };
};

export const actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		// Ambil string mentah dari form
		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();

		const data = {
			equipmentId: formData.get('equipmentId')?.toString(),
			maintenanceType: formData.get('maintenanceType')?.toString(),
			description: formData.get('description')?.toString(),
			// Konversi ke Date object atau ISO string yang valid sebelum parse
			scheduledDate: rawScheduledDate ? new Date(rawScheduledDate).toISOString() : null,
			completionDate: rawCompletionDate ? new Date(rawCompletionDate).toISOString() : null,
			status: formData.get('status')?.toString() || 'PENDING',
			technicianId: formData.get('technicianId')?.toString() || null
		};

		try {
			// Pastikan maintenanceSchema Anda menggunakan z.string().datetime()
			// atau z.preprocess untuk menangani string dari input HTML
			const validated = maintenanceSchema.parse(data);

			await db.insert(maintenance).values({
				id: uuidv4(),
				equipmentId: validated.equipmentId,
				maintenanceType: validated.maintenanceType,
				description: validated.description,
				status: validated.status,
				technicianId: validated.technicianId,
				// Drizzle mysql-core timestamp menerima objek Date
				scheduledDate: new Date(validated.scheduledDate),
				completionDate: validated.completionDate ? new Date(validated.completionDate) : null
			});

			return { success: true };
		} catch (err) {
			console.error(err);

			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}
	}
};
