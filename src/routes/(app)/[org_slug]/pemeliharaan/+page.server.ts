import { fail, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance, organization, equipment } from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { org_slug } = params;
	const equipmentIds = url.searchParams.get('equipmentIds')?.split(',').filter(Boolean) || [];

	// Ambil ID organisasi berdasarkan slug dari URL
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		throw error(404, 'Organization not found');
	}

	const maintenanceList = await db.query.maintenance.findMany({
		where: equipmentIds.length > 0 ? inArray(maintenance.equipmentId, equipmentIds) : undefined,
		with: {
			equipment: {
				with: {
					item: true
				}
			}
		},
		orderBy: [desc(maintenance.scheduledDate)]
	});

	// Ambil daftar alat untuk filter
	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, org.id),
		with: {
			item: true
		}
	});

	// Filter maintenanceList berdasarkan organizationId (jika equipment ada)
	const filteredMaintenance = maintenanceList.filter(
		(m) => m.equipment?.organizationId === org.id
	);

	return { 
		maintenance: filteredMaintenance,
		equipment: equipmentList,
		org_slug: org_slug,
		filters: {
			equipmentIds
		}
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { message: 'ID tidak ditemukan' });
		}

		try {
			// Cek apakah data ada sebelum dihapus
			const existing = await db.query.maintenance.findFirst({
				where: eq(maintenance.id, id)
			});

			if (!existing) {
				return fail(404, { message: 'Data pemeliharaan tidak ditemukan' });
			}

			await db.delete(maintenance).where(eq(maintenance.id, id));
		} catch (err) {
			console.error('Error deleting maintenance:', err);
			return fail(500, { message: 'Kesalahan server internal saat menghapus data' });
		}

		return { success: true, message: 'Data berhasil dihapus' };
	}
};
