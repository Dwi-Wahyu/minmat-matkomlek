import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth.utils';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Helper: Ambil data dan pastikan milik organisasi user
async function getMyEquipment(id: string, user: any) {
	let whereClause;
	if (user.role === 'superadmin' || user.organization?.parentId === null) {
		whereClause = eq(equipment.id, id);
	} else {
		whereClause = and(eq(equipment.id, id), eq(equipment.organizationId, user.organization?.id));
	}

	const item = await db.query.equipment.findFirst({
		where: whereClause
	});

	if (!item) {
		throw error(404, 'Equipment tidak ditemukan atau Anda tidak memiliki akses');
	}

	return item;
}

// GET: Ambil detail satu equipment
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = requirePermission('inventory', 'view', locals);
	const item = await getMyEquipment(params.id, user);
	return json(item);
};

// PATCH: Update equipment
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { user } = requirePermission('inventory', 'update', locals);
	const item = await getMyEquipment(params.id, user);
	requirePermission('inventory', 'update', locals, item.organizationId);

	const body = await request.json();

	await db
		.update(equipment)
		.set({
			brand: body.brand,
			condition: body.condition,
			status: body.status,
			updatedAt: new Date()
		})
		.where(eq(equipment.id, params.id));

	return json({ success: true });
};

// DELETE: Hapus equipment
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = requirePermission('inventory', 'delete', locals);
	const item = await getMyEquipment(params.id, user);
	requirePermission('inventory', 'delete', locals, item.organizationId);

	await db.delete(equipment).where(eq(equipment.id, params.id));

	return json({ success: true });
};
