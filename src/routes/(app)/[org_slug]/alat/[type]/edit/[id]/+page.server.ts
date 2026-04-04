import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { uploadFile, deleteFile } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, id } = params;

	const [warehousesResults, currentEquipmentResults] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db
			.select({
				equipment: equipment,
				item: item
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.where(eq(equipment.id, id))
			.limit(1)
	]);

	if (currentEquipmentResults.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	const currentEquipment = {
		...currentEquipmentResults[0].equipment,
		item: currentEquipmentResults[0].item
	};

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		equipment: currentEquipment,
		type: params.type
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
		const imageFile = formData.get('image') as File;

		if (!itemName) return fail(400, { message: 'Nama Alat harus diisi' });

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			// Menggunakan select eksplisit alih-alih db.query
			const currentResults = await db
				.select()
				.from(equipment)
				.where(eq(equipment.id, id))
				.limit(1);

			if (currentResults.length === 0) return fail(404, { message: 'Alat tidak ditemukan' });
			const current = currentResults[0];

			let imagePath = current.imagePath;

			// Upload new image if exists
			if (imageFile && imageFile.size > 0) {
				const { fileName: newFileName, error: uploadError } = await uploadFile(imageFile, 'equipment');
				if (uploadError) return fail(400, { message: uploadError });

				// Delete old image if new one is uploaded
				if (current.imagePath) {
					deleteFile(current.imagePath, 'equipment');
				}
				imagePath = newFileName;
			}

			// Find or Create Item
			let itemId: string;
			const existingItemResults = await db
				.select()
				.from(item)
				.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
				.limit(1);

			if (existingItemResults.length > 0) {
				itemId = existingItemResults[0].id;
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
					imagePath: imagePath,
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
