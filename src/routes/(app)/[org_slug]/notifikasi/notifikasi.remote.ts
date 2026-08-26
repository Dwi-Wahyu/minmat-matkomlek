import { query } from '$app/server';
import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/auth.utils';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export type NotifikasiListData = {
	notifications: any[];
};

export const getNotifikasiData = query(async (): Promise<NotifikasiListData> => {
	const { user } = requireAuth();

	const allNotifications = await db.query.notification.findMany({
		where: (notif, { eq, or }) =>
			or(eq(notif.userId, user.id), eq(notif.organizationId, user.organization.id)),
		orderBy: [desc(notification.createdAt)]
	});

	return {
		notifications: allNotifications.map((n) => ({
			...n,
			action: n.action ? JSON.parse(n.action) : null
		}))
	};
});
