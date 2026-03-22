import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug } = params;

	const [warehouses, org] = await Promise.all([
		db
			.select()
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db.query.organization.findFirst({ where: eq(organization.slug, org_slug) })
	]);

	return {
		warehouses: warehouses.map((w) => w.warehouse),
		org
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const { org_slug, type } = params;
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
			const org = await db.query.organization.findFirst({ where: eq(organization.slug, org_slug) });
			if (!org) return fail(404, { message: 'Organisasi tidak ditemukan' });

			// Create or Find Item
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

			await db.insert(equipment).values({
				id: crypto.randomUUID(),
				itemId,
				serialNumber: serialNumber || null,
				brand: brand || null,
				warehouseId: warehouseId || null,
				organizationId: org.id,
				condition: condition || 'BAIK',
				status: status || 'READY'
			});

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
