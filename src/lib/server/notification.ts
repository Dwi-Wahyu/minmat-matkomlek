import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { v4 as uuidv4 } from 'uuid';

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

	return await db.insert(notification).values({
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
}
