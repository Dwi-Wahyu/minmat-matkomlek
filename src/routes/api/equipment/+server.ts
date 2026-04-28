import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth.utils';
import { eq, and, or, like } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET: List equipment untuk organisasi user saat ini
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = requirePermission(locals, 'inventory', 'view');
	const search = url.searchParams.get('q');

	let whereClause;
	
	if (search) {
		whereClause = and(
			eq(equipment.organizationId, user.organization.id),
			or(
				like(equipment.serialNumber, `%${search}%`),
				like(item.name, `%${search}%`)
			)
		);
	} else {
		whereClause = eq(equipment.organizationId, user.organization.id);
	}

	const list = await db.query.equipment.findMany({
		where: whereClause,
		with: {
			item: true,
			warehouse: true
		},
		limit: search ? 20 : 100 // Limit results if searching
	});

	return json(list);
};

// POST: Tambah equipment baru
export const POST: RequestHandler = async ({ locals, request }) => {
	const { user } = requirePermission(locals, 'inventory', 'create');

	const body = await request.json();

	const newEquipment = await db.insert(equipment).values({
		id: crypto.randomUUID(),
		serialNumber: body.serialNumber,
		brand: body.brand,
		itemId: body.itemId,
		warehouseId: body.warehouseId,
		organizationId: user.organization.id, // Selalu ikat ke organisasi user
		condition: body.condition ?? 'BAIK',
		status: 'READY'
	});

	return json({ success: true, id: newEquipment[0].insertId }, { status: 201 });
};
