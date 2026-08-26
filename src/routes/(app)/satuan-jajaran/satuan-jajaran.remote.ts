import { query } from '$app/server';
import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq, ne } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';

export type SatuanJajaranListData = {
	units: any[];
};

export const getSatuanJajaranData = query(async (): Promise<SatuanJajaranListData> => {
	const { user } = requireAuth();

	const units = await db.query.organization.findMany({
		where: ne(organization.id, user.organization.id),
		orderBy: (org, { asc }) => [asc(org.name)]
	});

	return {
		units
	};
});
