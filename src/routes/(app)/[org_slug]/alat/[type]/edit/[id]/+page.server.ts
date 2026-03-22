import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type, id } = params;

	// Map URL type to database equipmentType
	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	const [warehouses, currentEquipment] = await Promise.all([
		db
			.select()
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db.query.equipment.findFirst({
			where: eq(equipment.id, id),
			with: { item: true }
		})
	]);

	if (!currentEquipment) {
		throw error(404, 'Alat tidak ditemukan');
	}

	return {
		warehouses: warehouses.map((w) => w.warehouse),
		equipment: currentEquipment,
		type
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { id, type } = params;
		const formData = await request.formData();

		const itemName = formData.get('itemName') as string;
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const warehouseId = formData.get('warehouseId') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
		const status = formData.get('status') as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE';

		if (!itemName) return fail(400, { message: 'Nama Alat harus diisi' });

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			// Find or Create Item
			let itemId: string;
			const existingItem = await db.query.item.findFirst({
				where: and(eq(item.name, itemName), eq(item.equipmentType, equipmentType))
			});

			if (existingItem) {
				itemId = existingItem.id;
			} else {
				itemId = crypto.randomUUID();
				await db.insert(item).values({
					id: itemId,
					name: itemName,
					type: 'ASSET',
					equipmentType: equipmentType,
					baseUnit: 'UNIT'
				});
			}

			await db
				.update(equipment)
				.set({
					itemId,
					serialNumber: serialNumber || null,
					brand: brand || null,
					warehouseId: warehouseId || null,
					condition: condition || 'BAIK',
					status: status || 'READY',
					updatedAt: new Date()
				})
				.where(eq(equipment.id, id));

			return { success: true, message: 'Data alat berhasil diperbarui' };
		} catch (error: any) {
			console.error(error);
			if (error.code === 'ER_DUP_ENTRY') {
				return fail(400, { message: 'Serial Number sudah terdaftar' });
			}
			return fail(500, { message: 'Gagal memperbarui data alat' });
		}
	}
};
