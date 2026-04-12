import { db } from '$lib/server/db';
import { warehouse } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/login');

	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, user.organization.id),
		orderBy: [desc(warehouse.createdAt)]
	});

	return {
		warehouses
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID Gudang diperlukan' });

		try {
			await db.delete(warehouse).where(eq(warehouse.id, id));
			return { success: true, message: 'Gudang berhasil dihapus' };
		} catch (error) {
			console.error('Error deleting warehouse:', error);
			return fail(500, {
				message: 'Gagal menghapus gudang. Pastikan gudang tidak sedang digunakan oleh data materiil.'
			});
		}
	}
};
