import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { maintenance } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const maintenanceList = await db.query.maintenance.findMany({
		with: {
			equipment: true
		},
		orderBy: [desc(maintenance.scheduledDate)]
	});

	return { maintenance: maintenanceList };
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
