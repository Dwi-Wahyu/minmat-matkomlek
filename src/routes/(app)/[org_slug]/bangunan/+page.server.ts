import { db } from '$lib/server/db';
import { building } from '$lib/server/db/schema';
import { eq, and, like, sql, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url }) => {
	const { org_slug } = params;
	const searchQuery = url.searchParams.get('q') || '';
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = 10;
	const offset = (page - 1) * limit;

	const filters = [];

	if (searchQuery) {
		filters.push(
			sql`(${like(building.code, `%${searchQuery}%`)} OR ${like(building.name, `%${searchQuery}%`)} OR ${like(building.location, `%${searchQuery}%`)})`
		);
	}

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(building)
			.where(filters.length > 0 ? and(...filters) : undefined)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(building.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(building)
			.where(filters.length > 0 ? and(...filters) : undefined)
	]);

	const totalItems = totalCountResult[0].count;

	return {
		buildings: data,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(totalItems / limit),
			totalItems
		},
		filters: { q: searchQuery }
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { message: 'ID is required' });

		try {
			await db.delete(building).where(eq(building.id, id));
			return { success: true, message: 'Data bangunan berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus data bangunan' });
		}
	}
};
