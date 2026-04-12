import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, maintenance, user } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';

const maintenanceSchema = z.object({
	equipmentIds: z.array(z.string()).min(1),
	maintenanceType: z.enum(['PERAWATAN', 'PERBAIKAN']),
	description: z.string().min(1),
	scheduledDate: z.string().datetime(),
	completionDate: z.string().datetime().optional().nullable(),
	status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING'),
	technicianId: z.string().optional().nullable()
});

export const load: PageServerLoad = async ({ params, locals }) => {
	const { org_slug } = params;

	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: (org, { eq }) => eq(org.slug, org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, org.id),
		columns: { id: true, serialNumber: true },
		with: {
			item: {
				columns: {
					name: true
				}
			}
		}
	});

	// Urutkan berdasarkan nama item
	const sortedEquipment = [...equipmentList].sort((a, b) =>
		(a.item?.name || '').localeCompare(b.item?.name || '')
	);

	const technicianList = await db.query.user.findMany({
		columns: { id: true, name: true, email: true },
		orderBy: (user, { asc }) => [asc(user.name)]
	});

	return {
		equipment: sortedEquipment,
		technicians: technicianList,
		org_slug
	};
};

export const actions = {
	default: async ({ request, params }) => {
		const { org_slug } = params;
		const formData = await request.formData();

		const rawScheduledDate = formData.get('scheduledDate')?.toString();
		const rawCompletionDate = formData.get('completionDate')?.toString();
		const rawTechnicianId = formData.get('technicianId')?.toString();

		const data = {
			equipmentIds: formData.getAll('equipmentId').map(id => id.toString()),
			maintenanceType: formData.get('maintenanceType')?.toString(),
			description: formData.get('description')?.toString(),
			scheduledDate:
				rawScheduledDate && rawScheduledDate !== ''
					? new Date(rawScheduledDate).toISOString()
					: null,
			completionDate:
				rawCompletionDate && rawCompletionDate !== ''
					? new Date(rawCompletionDate).toISOString()
					: null,
			status: formData.get('status')?.toString() || 'PENDING',
			technicianId: rawTechnicianId && rawTechnicianId !== '' ? rawTechnicianId : null
		};

		try {
			const validated = maintenanceSchema.parse(data);

			await db.transaction(async (tx) => {
				for (const equipmentId of validated.equipmentIds) {
					await tx.insert(maintenance).values({
						id: uuidv4(),
						equipmentId,
						maintenanceType: validated.maintenanceType,
						description: validated.description,
						status: validated.status,
						technicianId: validated.technicianId,
						scheduledDate: new Date(validated.scheduledDate),
						completionDate: validated.completionDate ? new Date(validated.completionDate) : null
					});
				}
			});
		} catch (err) {
			console.error(err);

			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}

		throw redirect(303, `/${org_slug}/pemeliharaan`);
	}
};
