import { db } from '$lib/server/db';
import { warehouse, equipment, item } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// Ambil data gudang berdasarkan organisasi user untuk select di frontend
	const warehouses = await db
		.select()
		.from(warehouse)
		.where(eq(warehouse.organizationId, locals.user.organization.id));

	return {
		warehouses
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		// Ekstraksi data dari form
		const name = formData.get('name') as string;
		const serialNumber = formData.get('serialNumber') as string;
		const brand = formData.get('brand') as string;
		const type = formData.get('type') as 'ALKOMLEK' | 'PERNIKA_LEK';
		const category = formData.get('category') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';
		const warehouseId = formData.get('warehouseId') as string;
		const quantity = parseInt(formData.get('quantity') as string);

		// Validasi sederhana
		if (!name || !warehouseId || isNaN(quantity)) {
			return fail(400, { message: 'Data tidak lengkap' });
		}

		try {
			// Jalankan transaksi database
			await db.transaction(async (tx) => {
				const equipmentId = uuidv4();
				const itemId = uuidv4();

				await tx.insert(item).values({
					id: itemId,
					name,
					baseUnit: 'UNIT',
					type: 'ASSET'
				});

				// Insert ke tabel equipment
				await tx.insert(equipment).values({
					id: equipmentId,
					name,
					serialNumber,
					brand,
					type,
					category,
					condition,
					itemId
				});

				// Ambil data gudang untuk mendapatkan 'category' sebagai 'stockStatus'
				const [targetWarehouse] = await tx
					.select()
					.from(warehouse)
					.where(eq(warehouse.id, warehouseId))
					.limit(1);

				if (!targetWarehouse) throw new Error('Gudang tidak ditemukan');
			});

			return { success: true, message: 'Alat berhasil ditambahkan' };
		} catch (e) {
			console.error(e);
			return fail(500, { message: 'Gagal menyimpan data ke database' });
		}
	}
};
