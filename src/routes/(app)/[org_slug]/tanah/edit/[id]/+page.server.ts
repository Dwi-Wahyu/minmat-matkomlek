import { db } from '$lib/server/db';
import { land } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const landData = await db.query.land.findFirst({
		where: eq(land.id, id)
	});

	if (!landData) {
		throw error(404, 'Data tanah tidak ditemukan');
	}

	return {
		land: landData
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();

		const certificateNumber = formData.get('certificateNumber') as string;
		const location = formData.get('location') as string;
		const area = formData.get('area') as string;
		const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
		const usage = formData.get('usage') as string;
		const description = formData.get('description') as string;
		const latitude = formData.get('latitude') as string;
		const longitude = formData.get('longitude') as string;

		if (!certificateNumber || !location || !area || !status || !usage) {
			return fail(400, { message: 'Semua field wajib diisi' });
		}

		try {
			await db
				.update(land)
				.set({
					certificateNumber,
					location,
					area,
					status,
					usage,
					description,
					latitude: latitude ? latitude : null,
					longitude: longitude ? longitude : null,
					updatedAt: new Date()
				})
				.where(eq(land.id, id));

			return { success: true, message: 'Data tanah berhasil diperbarui' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal memperbarui data tanah' });
		}
	}
};
