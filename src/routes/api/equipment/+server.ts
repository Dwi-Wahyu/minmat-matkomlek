import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item } from '$lib/server/db/schema';
import { requirePermission } from '$lib/server/auth.utils';
import { eq, and, or, like, desc, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// GET: List equipment untuk organisasi user saat ini
export const GET: RequestHandler = async ({ locals, url }) => {
	const { user } = requirePermission('inventory', 'view', locals);
	const search = url.searchParams.get('q');
	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 20;
	const offset = (page - 1) * limit;

	const isCentralOrSuper = user.role === 'superadmin' || user.organization?.parentId === null;

	let whereClause;

	if (isCentralOrSuper) {
		if (search) {
			whereClause = or(like(equipment.serialNumber, `%${search}%`), like(item.name, `%${search}%`));
		} else {
			whereClause = undefined;
		}
	} else {
		if (search) {
			whereClause = and(
				eq(equipment.organizationId, user.organization.id),
				or(like(equipment.serialNumber, `%${search}%`), like(item.name, `%${search}%`))
			);
		} else {
			whereClause = eq(equipment.organizationId, user.organization.id);
		}
	}

	const list = await db.query.equipment.findMany({
		where: whereClause,
		with: {
			item: true,
			warehouse: true
		},
		limit: limit,
		offset: offset,
		orderBy: [desc(equipment.createdAt)]
	});

	// Get total count for pagination metadata
	const totalResult = await db
		.select({ count: sql<number>`count(*)` })
		.from(equipment)
		.innerJoin(item, eq(equipment.itemId, item.id))
		.where(whereClause);

	const total = totalResult[0].count;

	return json({
		data: list,
		pagination: {
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit)
		}
	});
};

// POST: Tambah equipment baru
export const POST: RequestHandler = async ({ locals, request }) => {
	const body = await request.json();
	const targetOrgId = body.organizationId || locals.user?.organization?.id;

	const { user } = requirePermission('inventory', 'create', locals, targetOrgId);

	// Tentukan orgId: superadmin/pusat dapat menentukan orgId tujuan, satker dikunci ke orgId sendiri
	const isCentralOrSuper = user.role === 'superadmin' || user.organization?.parentId === null;
	const orgId = isCentralOrSuper ? targetOrgId : user.organization.id;

	const newEquipment = await db.insert(equipment).values({
		id: crypto.randomUUID(),
		serialNumber: body.serialNumber,
		brand: body.brand,
		itemId: body.itemId,
		warehouseId: body.warehouseId,
		organizationId: orgId, // Ikat ke organisasi yang sesuai
		condition: body.condition ?? 'BAIK',
		status: 'READY',
		createdAt: new Date()
	});

	return json({ success: true, id: newEquipment[0].insertId }, { status: 201 });
};
