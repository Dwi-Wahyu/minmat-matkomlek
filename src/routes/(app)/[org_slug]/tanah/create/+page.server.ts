import { db } from '$lib/server/db';
import { land } from '$lib/server/db/schema';
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { org_slug } = params;
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
			await db.insert(land).values({
				id: crypto.randomUUID(),
				certificateNumber,
				location,
				area,
				status,
				usage,
				description,
				latitude: latitude ? latitude : null,
				longitude: longitude ? longitude : null
			});

			return { success: true, message: 'Data tanah berhasil ditambahkan' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menambahkan data tanah' });
		}
	}
};
