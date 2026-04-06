import { db } from '$lib/server/db';
import { land } from '$lib/server/db/schema';
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
			sql`(${like(land.certificateNumber, `%${searchQuery}%`)} OR ${like(land.location, `%${searchQuery}%`)} OR ${like(land.usage, `%${searchQuery}%`)})`
		);
	}

	const [data, totalCountResult] = await Promise.all([
		db
			.select()
			.from(land)
			.where(filters.length > 0 ? and(...filters) : undefined)
			.limit(limit)
			.offset(offset)
			.orderBy(desc(land.createdAt)),
		db
			.select({ count: sql<number>`count(*)` })
			.from(land)
			.where(filters.length > 0 ? and(...filters) : undefined)
	]);

	const totalItems = totalCountResult[0].count;

	return {
		lands: data,
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
			await db.delete(land).where(eq(land.id, id));
			return { success: true, message: 'Data tanah berhasil dihapus' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menghapus data tanah' });
		}
	}
};
