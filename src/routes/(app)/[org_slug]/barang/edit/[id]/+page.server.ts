import { db } from '$lib/server/db';
import { item } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const dataResults = await db
		.select()
		.from(item)
		.where(and(eq(item.id, params.id), eq(item.type, 'CONSUMABLE')))
		.limit(1);

	if (dataResults.length === 0) throw error(404, 'Barang tidak ditemukan');

	return { consumable: dataResults[0] };
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const baseUnit = formData.get('baseUnit') as any;
		const description = formData.get('description') as string;

		try {
			const currentResults = await db.select().from(item).where(eq(item.id, params.id)).limit(1);

			if (currentResults.length === 0) return fail(404, { message: 'Barang tidak ditemukan' });
			const current = currentResults[0];

			await db
				.update(item)
				.set({
					name,
					baseUnit,
					description
				})
				.where(eq(item.id, params.id));

			return { success: true, message: 'Data barang berhasil diperbarui' };
		} catch (error) {
			console.error(error);
			return fail(400, {
				success: false,
				message: 'Gagal memperbarui data barang'
			});
		}
	}
};
