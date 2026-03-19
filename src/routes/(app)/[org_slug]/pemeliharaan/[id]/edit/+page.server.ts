import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

const maintenanceSchema = z.object({
	equipmentId: z.string().uuid(),
	maintenanceType: z.enum(['PERAWATAN', 'PERBAIKAN']),
	description: z.string().min(1),
	scheduledDate: z.string().datetime(),
	completionDate: z.string().datetime().optional().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: z.string().uuid().optional().nullable()
});

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const maintenanceData = await db.query.maintenance.findFirst({
		where: eq(maintenance.id, id)
	});

	if (!maintenanceData) {
		throw redirect(303, '/maintenance');
	}

	const equipmentList = await db.query.equipment.findMany({
		columns: { id: true, name: true, serialNumber: true },
		orderBy: (eq, { asc }) => [asc(eq.name)]
	});

	const technicianList = await db.query.user.findMany({
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	// Format tanggal untuk input datetime-local
	const formatDateForInput = (date: Date | null): string => {
		if (!date) return '';
		return new Date(date).toISOString().slice(0, 16);
	};

	return {
		maintenance: {
			...maintenanceData,
			scheduledDate: formatDateForInput(maintenanceData.scheduledDate),
			completionDate: formatDateForInput(maintenanceData.completionDate)
		},
		equipment: equipmentList,
		technicians: technicianList
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();
		const data = {
			equipmentId: formData.get('equipmentId')?.toString(),
			maintenanceType: formData.get('maintenanceType')?.toString(),
			description: formData.get('description')?.toString(),
			scheduledDate: formData.get('scheduledDate')?.toString(),
			completionDate: formData.get('completionDate')?.toString() || null,
			status: formData.get('status')?.toString() || 'PENDING',
			technicianId: formData.get('technicianId')?.toString() || null
		};

		try {
			const validated = maintenanceSchema.parse(data);

			await db
				.update(maintenance)
				.set({
					...validated,
					scheduledDate: new Date(validated.scheduledDate),
					completionDate: validated.completionDate ? new Date(validated.completionDate) : null
				})
				.where(eq(maintenance.id, id));
		} catch (err) {
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}

		throw redirect(303, '/maintenance');
	}
};
