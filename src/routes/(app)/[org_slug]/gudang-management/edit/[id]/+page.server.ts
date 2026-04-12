import { db } from '$lib/server/db';
import { warehouse } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/login');

	const data = await db.query.warehouse.findFirst({
		where: and(eq(warehouse.id, params.id), eq(warehouse.organizationId, user.organization.id))
	});

	if (!data) throw redirect(302, `/${params.org_slug}/gudang-management`);

	return {
		warehouse: data
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { user } = locals;
		if (!user) throw redirect(302, '/login');

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const location = formData.get('location') as string;

		if (!name) {
			return fail(400, { message: 'Nama gudang wajib diisi' });
		}

		try {
			await db
				.update(warehouse)
				.set({ name, location })
				.where(and(eq(warehouse.id, params.id), eq(warehouse.organizationId, user.organization.id)));
			return { success: true, message: 'Perubahan gudang berhasil disimpan' };
		} catch (error) {
			console.error('Error updating warehouse:', error);
			return fail(500, { message: 'Gagal memperbarui gudang' });
		}
	}
};
