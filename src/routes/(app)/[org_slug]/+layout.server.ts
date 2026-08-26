import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { and, desc, eq, or, count } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, '/');
	}

	const userId = locals.user.id;
	const orgId = locals.user.organization.id;
	const cacheKey = CacheKeys.notifLayout(userId);

	const result = await getOrSetCache(
		cacheKey,
		async () => {
			const [latestNotifications, [unreadCountResult]] = await Promise.all([
				db.query.notification.findMany({
					where: (notif, { eq, or }) =>
						or(eq(notif.userId, userId), eq(notif.organizationId, orgId)),
					orderBy: [desc(notification.createdAt)],
					limit: 5
				}),
				db
					.select({ count: count() })
					.from(notification)
					.where(
						and(
							eq(notification.read, false),
							or(eq(notification.userId, userId), eq(notification.organizationId, orgId))
						)
					)
			]);

			return {
				notifications: latestNotifications.map((n) => ({
					...n,
					action: n.action ? JSON.parse(n.action) : null
				})),
				unreadCount: unreadCountResult?.count ?? 0
			};
		},
		CacheTTL.NOTIF_LAYOUT
	);

	return {
		...result,
		user: locals.user
	};
};
