import { db } from '$lib/server/db';
import { building } from '$lib/server/db/schema';
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ request, params }) => {
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
			await db.insert(building).values({
				id: crypto.randomUUID(),
				code,
				name,
				location,
				type,
				area,
				condition,
				status,
				description,
				latitude: latitude ? latitude : null,
				longitude: longitude ? longitude : null
			});

			return { success: true, message: 'Data bangunan berhasil ditambahkan' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menambahkan data bangunan' });
		}
	}
};
