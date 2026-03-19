import { db } from '$lib/server/db';
import { warehouse, equipment, item } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [existingEquipment] = await db
		.select()
		.from(equipment)
		.where(eq(equipment.id, params.id))
		.limit(1);

	if (!existingEquipment) {
		throw error(404, 'Alat tidak ditemukan');
	}

	const warehouses = await db.select().from(warehouse);

	return {
		equipment: existingEquipment,
		warehouses
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const { id, type } = params;

		const name = formData.get('name') as string;
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const category = formData.get('category') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
		const warehouseId = formData.get('warehouseId') as string;
		const quantity = parseInt(formData.get('quantity') as string);

		if (!id || !name || !warehouseId || isNaN(quantity)) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		try {
			await db.transaction(async (tx) => {
				const [targetWarehouse] = await tx
					.select()
					.from(warehouse)
					.where(eq(warehouse.id, warehouseId))
					.limit(1);

				const findEq = await db.query.equipment.findFirst({
					where: (equipment, { eq }) => eq(equipment.id, id),

					columns: {
						id: true,
						name: true,
						itemId: true
					}
				});

				if (!findEq) throw new Error('Alat tidak ditemukan');

				if (!targetWarehouse) throw new Error('Gudang tidak ditemukan');

				await tx
					.update(equipment)
					.set({
						name,
						serialNumber,
						brand,
						type: type as 'ALKOMLEK' | 'PERNIKA_LEK',
						category,
						condition,
						updatedAt: new Date()
					})
					.where(eq(equipment.id, id));

				await tx
					.update(item)
					.set({
						name
					})
					.where(eq(equipment.id, findEq.itemId));
			});

			return { success: true, message: 'Data alat berhasil diperbarui' };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal memperbarui data' });
		}
	}
};
