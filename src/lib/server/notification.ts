import { db } from '$lib/server/db';
import { notification, member } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';
import { invalidateNotifCache } from '$lib/server/redis';
import { eq } from 'drizzle-orm';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface NotificationAction {
	type: string;
	resourceId: string;
	webPath: string;
	mobilePath?: string;
}

export interface CreateNotificationParams {
	userId?: string;
	organizationId?: string;
	title: string;
	body: string;
	priority?: NotificationPriority;
	action?: NotificationAction;
}

/**
 * Helper to create a notification for a user or an organization.
 */
export async function createNotification(params: CreateNotificationParams) {
	const { userId, organizationId, title, body, priority = 'MEDIUM', action } = params;

	if (!userId && !organizationId) {
		throw new Error('Either userId or organizationId must be provided to create a notification.');
	}

	const result = await db.insert(notification).values({
		id: uuidv4(),
		userId: userId || null,
		organizationId: organizationId || null,
		title,
		body,
		priority,
		action: action ? JSON.stringify(action) : null,
		read: false,
		createdAt: new Date()
	});

	// Invalidasi cache layout notifikasi untuk user terkait
	if (userId) {
		invalidateNotifCache(userId).catch((err) => {
			console.error('Error invalidating notification cache:', err);
		});
	}

	// Invalidasi cache layout notifikasi untuk semua member dalam organisasi
	if (organizationId) {
		db.query.member
			.findMany({
				where: eq(member.organizationId, organizationId),
				columns: { userId: true }
			})
			.then((members) => {
				for (const m of members) {
					if (m.userId) {
						invalidateNotifCache(m.userId).catch((err) => {
							console.error('Error invalidating notification cache for org member:', err);
						});
					}
				}
			})
			.catch((err) => {
				console.error('Error finding members for cache invalidation:', err);
			});
	}

	return result;
}
