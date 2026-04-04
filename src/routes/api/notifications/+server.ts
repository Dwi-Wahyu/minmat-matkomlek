import { db } from '$lib/server/db';
import { notification } from '$lib/server/db/schema';
import { and, desc, eq, or } from 'drizzle-orm';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const limit = url.searchParams.get('limit');
	const parsedLimit = limit ? parseInt(limit) : undefined;
	const finalLimit = parsedLimit && !isNaN(parsedLimit) ? parsedLimit : 10;

	const userOrgId = locals.user.organization?.id;

	const whereClause = userOrgId
		? or(eq(notification.userId, locals.user.id), eq(notification.organizationId, userOrgId))
		: eq(notification.userId, locals.user.id);

	const notifications = await db
		.select()
		.from(notification)
		.where(whereClause)
		.orderBy(desc(notification.createdAt))
		.limit(finalLimit);

	return json(notifications);
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id } = await request.json();
	if (!id) return json({ error: 'ID is required' }, { status: 400 });

	const userOrgId = locals.user.organization?.id;

	const whereClause = userOrgId
		? or(eq(notification.userId, locals.user.id), eq(notification.organizationId, userOrgId))
		: eq(notification.userId, locals.user.id);

	await db
		.update(notification)
		.set({ read: true })
		.where(and(eq(notification.id, id), whereClause));

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });

	const { id, clearAll, organizationId } = await request.json();

	const userOrgId = locals.user.organization?.id;

	if (clearAll) {
		await db.delete(notification).where(
			or(
				eq(notification.userId, locals.user.id),
				organizationId ? eq(notification.organizationId, organizationId) : undefined,
				userOrgId ? eq(notification.organizationId, userOrgId) : undefined
			)
		);
		return json({ success: true });
	}

	if (!id) return json({ error: 'ID is required' }, { status: 400 });

	const whereClause = userOrgId
		? or(eq(notification.userId, locals.user.id), eq(notification.organizationId, userOrgId))
		: eq(notification.userId, locals.user.id);

	await db
		.delete(notification)
		.where(and(eq(notification.id, id), whereClause));

	return json({ success: true });
};
