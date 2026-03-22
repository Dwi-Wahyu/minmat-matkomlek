import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = await request.json();
	if (!id) return json({ error: 'ID is required' }, { status: 400 });

	await db
		.update(notification)
		.set({ read: true })
		.where(
			and(
				eq(notification.id, id),
				or(
					eq(notification.userId, locals.user.id),
					// Also allow if it belongs to their organization (optional security check)
					eq(notification.organizationId, locals.user.organization.id)
				)
			)
		);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id, clearAll, organizationId } = await request.json();

	if (clearAll) {
		await db.delete(notification).where(
			or(
				eq(notification.userId, locals.user.id),
				organizationId ? eq(notification.organizationId, organizationId) : undefined
			)
		);
		return json({ success: true });
	}

	if (!id) return json({ error: 'ID is required' }, { status: 400 });

	await db
		.delete(notification)
		.where(
			and(
				eq(notification.id, id),
				or(
					eq(notification.userId, locals.user.id),
					eq(notification.organizationId, locals.user.organization.id)
				)
			)
		);

	return json({ success: true });
};
