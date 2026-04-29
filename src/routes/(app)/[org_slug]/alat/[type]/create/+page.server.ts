import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const [warehousesResults, orgResults] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db
			.select()
			.from(organization)
			.where(eq(organization.slug, org_slug))
			.limit(1)
	]);

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		org: orgResults[0] || null,
		type
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { org_slug, type } = params;
		const formData = await request.formData();

		const itemName = formData.get('itemName') as string;
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const warehouseId = formData.get('warehouseId') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
		const status = formData.get('status') as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE';
		const classification = formData.get('classification') as
			| 'BALKIR'
			| 'KOMUNITY'
			| 'TRANSITO'
			| '';
		const imageFile = formData.get('image') as File;

		if (!itemName) return fail(400, { message: 'Nama Alat harus diisi' });

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'item');
		if (uploadError) return fail(400, { message: uploadError });

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			const orgResults = await db
				.select()
				.from(organization)
				.where(eq(organization.slug, org_slug))
				.limit(1);

			if (orgResults.length === 0) return fail(404, { message: 'Organisasi tidak ditemukan' });
			const org = orgResults[0];

			// Create or Find Item
			let itemId: string;
			const existingItemResults = await db
				.select()
				.from(item)
				.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
				.limit(1);

			if (existingItemResults.length > 0) {
				itemId = existingItemResults[0].id;
				// Update image if new image provided
				if (fileName) {
					await db.update(item).set({ imagePath: fileName }).where(eq(item.id, itemId));
				}
			} else {
				itemId = crypto.randomUUID();
				await db.insert(item).values({
					id: itemId,
					name: itemName,
					type: 'ASSET',
					equipmentType: equipmentType,
					baseUnit: 'UNIT',
					imagePath: fileName
				});
			}

			const equipmentId = crypto.randomUUID();
			await db.insert(equipment).values({
				id: equipmentId,
				itemId,
				serialNumber: serialNumber || null,
				brand: brand || null,
				warehouseId: warehouseId || null,
				organizationId: org.id,
				condition: condition || 'BAIK',
				status: status || 'READY'
			});

			// Create movement record if classification is provided
			if (classification) {
				await db.insert(movement).values({
					id: crypto.randomUUID(),
					itemId,
					equipmentId,
					eventType: 'RECEIVE',
					qty: '1.0000',
					classification,
					toWarehouseId: warehouseId || null,
					organizationId: org.id,
					picId: locals.user?.id,
					notes: `Penambahan alat baru dengan klasifikasi ${classification}`
				});
			}

			return { success: true, message: 'Alat berhasil ditambahkan' };
		} catch (error: any) {
			console.error(error);
			if (error.code === 'ER_DUP_ENTRY') {
				return fail(400, { message: 'Serial Number sudah terdaftar' });
			}
			return fail(500, { message: 'Gagal menambahkan alat' });
		}
	}
};
