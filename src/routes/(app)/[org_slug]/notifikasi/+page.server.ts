import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { desc, eq, or } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(302, '/login');

	const allNotifications = await db.query.notification.findMany({
		where: (notif, { eq, or }) =>
			or(
				eq(notif.userId, locals.user.id),
				eq(notif.organizationId, locals.user.organization.id)
			),
		orderBy: [desc(notification.createdAt)]
	});

	return {
		notifications: allNotifications.map((n) => ({
			...n,
			action: n.action ? JSON.parse(n.action) : null
		}))
	};
};
