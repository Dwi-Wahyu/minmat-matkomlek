import { db } from '$lib/server/db';
import { equipment, item, warehouse, movement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id, org_slug } = params;
	const { user } = locals;

	if (!user) throw redirect(302, '/login');

	const data = await db.query.equipment.findFirst({
		where: eq(equipment.id, id),
		with: {
			item: true,
			warehouse: true
		}
	});

	if (!data) throw redirect(302, `/${org_slug}/alat/${params.type}`);

	// Fetch available warehouses for the organization
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, user.organization.id)
	});

	return {
		equipment: data,
		warehouses,
		type: params.type
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const eventType = formData.get('eventType') as any;
		const classification = formData.get('classification') as any;
		const toWarehouseId = formData.get('toWarehouseId') as string;
		const specificLocationName = formData.get('specificLocationName') as string;
		const notes = formData.get('notes') as string;

		const { id, org_slug, type } = params;

		try {
			// Start a transaction to update equipment and record movement
			await db.transaction(async (tx) => {
				const currentEquipment = await tx.query.equipment.findFirst({
					where: eq(equipment.id, id)
				});

				if (!currentEquipment) throw new Error('Alat tidak ditemukan');

				let fromWhId: string | null = null;
				let toWhId: string | null = null;
				let equipmentUpdate: any = {};

				// 1. Logic based on business rules
				switch (eventType) {
					case 'RECEIVE':
						// External -> System
						fromWhId = null;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: toWhId, status: 'READY' };
						break;

					case 'ISSUE':
						// System -> External (Permanent)
						fromWhId = currentEquipment.warehouseId;
						toWhId = null;
						equipmentUpdate = { warehouseId: null, status: 'READY' };
						break;

					case 'TRANSFER_OUT':
						// Internal Movement (Kirim)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: toWhId, status: 'TRANSIT' };
						break;

					case 'TRANSFER_IN':
						// Internal Movement (Terima)
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
						equipmentUpdate = { warehouseId: toWhId, status: 'READY' };
						break;

					default:
						fromWhId = currentEquipment.warehouseId;
						toWhId = toWarehouseId;
				}

				// Update Equipment State
				if (Object.keys(equipmentUpdate).length > 0) {
					await tx.update(equipment).set(equipmentUpdate).where(eq(equipment.id, id));
				}

				// Record the movement
				await tx.insert(movement).values({
					id: crypto.randomUUID(),
					equipmentId: id,
					organizationId: user.organization.id,
					eventType: eventType,
					classification: classification || null,
					qty: '1.0000',
					fromWarehouseId: fromWhId,
					toWarehouseId: toWhId,
					specificLocationName: specificLocationName || null,
					notes: notes || `Mutasi manual: ${eventType}`,
					picId: user.id,
					createdAt: new Date()
				});
			});

			return { success: true, message: 'Mutasi alat berhasil dicatat' };
		} catch (error) {
			console.error('Error in mutate equipment:', error);
			return fail(500, { message: 'Gagal mencatat mutasi alat' });
		}
	}
};
