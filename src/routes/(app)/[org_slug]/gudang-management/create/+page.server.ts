import { db } from '$lib/server/db';
import { warehouse } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { user } = locals;
		if (!user) throw redirect(302, '/login');

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const location = formData.get('location') as string;

		if (!name) {
			return fail(400, { message: 'Nama gudang wajib diisi' });
		}

		try {
			await db.insert(warehouse).values({
				id: crypto.randomUUID(),
				name,
				location,
				organizationId: user.organization.id
			});
			return { success: true, message: 'Gudang berhasil ditambahkan' };
		} catch (error) {
			console.error('Error creating warehouse:', error);
			return fail(500, { message: 'Gagal membuat gudang' });
		}
	}
};
