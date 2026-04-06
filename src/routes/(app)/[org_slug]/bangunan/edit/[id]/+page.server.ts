import { db } from '$lib/server/db';
import { building } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const buildingData = await db.query.building.findFirst({
		where: eq(building.id, id)
	});

	if (!buildingData) {
		throw error(404, 'Data bangunan tidak ditemukan');
	}

	return {
		building: buildingData
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id } = params;
		const formData = await request.formData();

		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const location = formData.get('location') as string;
		const type = formData.get('type') as string;
		const area = formData.get('area') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK';
		const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
		const description = formData.get('description') as string;
		const latitude = formData.get('latitude') as string;
		const longitude = formData.get('longitude') as string;

		if (!code || !name || !location || !type || !area || !condition || !status) {
			return fail(400, { message: 'Field bertanda bintang wajib diisi' });
		}

		try {
			await db
				.update(building)
				.set({
					code,
					name,
					location,
					type,
					area,
					condition,
					status,
					description,
					latitude: latitude ? latitude : null,
					longitude: longitude ? longitude : null,
					updatedAt: new Date()
				})
				.where(eq(building.id, id));

			return { success: true, message: 'Data bangunan berhasil diperbarui' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal memperbarui data bangunan' });
		}
	}
};
