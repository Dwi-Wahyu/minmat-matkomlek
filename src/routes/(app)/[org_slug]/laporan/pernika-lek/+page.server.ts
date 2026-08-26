import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { error } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { getOrSetCache, invalidateCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	return {
		isParentOrg: user?.organization?.parentId === null
	};
};

export const actions: Actions = {
	reload: async ({ params }) => {
		const { org_slug } = params;
		const cacheKey = `report:pernika-lek:${org_slug}`;
		await invalidateCache(cacheKey);
		return { success: true };
	}
};
