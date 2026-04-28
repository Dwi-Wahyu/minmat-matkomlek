import { db } from '$lib/server/db';
import { warehouse, equipment, movement } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/login');

	const ids = url.searchParams.get('ids')?.split(',') || [];

	// Fetch available warehouses for the organization
	const [warehouses, selectedEquipment] = await Promise.all([
		db.query.warehouse.findMany({
			where: eq(warehouse.organizationId, user.organization.id)
		}),
		ids.length > 0
			? db.query.equipment.findMany({
					where: inArray(equipment.id, ids),
					with: {
						item: true,
						warehouse: true
					}
				})
			: Promise.resolve([])
	]);

	return {
		warehouses,
		selectedEquipment
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const batchDataRaw = formData.get('batchData') as string;
		
		if (!batchDataRaw) {
			return fail(400, { message: 'Data mutasi tidak boleh kosong' });
		}

		const batchItems = JSON.parse(batchDataRaw);

		try {
			await db.transaction(async (tx) => {
				for (const item of batchItems) {
					const { equipmentId, eventType, classification, toWarehouseId, specificLocationName, notes } = item;

					const currentEquipment = await tx.query.equipment.findFirst({
						where: eq(equipment.id, equipmentId)
					});

					if (!currentEquipment) continue;

					let fromWhId = currentEquipment.warehouseId;
					let toWhId = toWarehouseId || null; // Sanitize empty string to null
					let equipmentUpdate: any = {};

					switch (eventType) {
						case 'RECEIVE':
							fromWhId = null;
							equipmentUpdate = { warehouseId: toWhId, status: 'READY' };
							break;
						case 'ISSUE':
							fromWhId = currentEquipment.warehouseId;
							toWhId = null;
							equipmentUpdate = { warehouseId: null, status: 'READY' };
							break;
						case 'TRANSFER_OUT':
							fromWhId = currentEquipment.warehouseId;
							equipmentUpdate = { warehouseId: toWhId, status: 'TRANSIT' };
							break;
						case 'TRANSFER_IN':
							fromWhId = currentEquipment.warehouseId;
							equipmentUpdate = { warehouseId: toWhId, status: 'READY' };
							break;
						default:
							fromWhId = currentEquipment.warehouseId;
					}

					// Update Equipment
					if (Object.keys(equipmentUpdate).length > 0) {
						await tx.update(equipment).set(equipmentUpdate).where(eq(equipment.id, equipmentId));
					}

					// Record Movement
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: equipmentId,
						organizationId: user.organization.id,
						eventType: eventType,
						classification: classification || null,
						qty: '1.0000',
						fromWarehouseId: fromWhId,
						toWarehouseId: toWhId,
						specificLocationName: specificLocationName || null,
						notes: notes || `Mutasi batch: ${eventType}`,
						picId: user.id,
						createdAt: new Date()
					});
				}
			});

			return { success: true, message: `${batchItems.length} alat berhasil dimutasi` };
		} catch (error) {
			console.error('Error in batch mutate:', error);
			return fail(500, { message: 'Gagal memproses mutasi batch' });
		}
	}
};
