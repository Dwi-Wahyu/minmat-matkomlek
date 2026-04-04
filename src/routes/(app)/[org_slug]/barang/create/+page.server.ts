// import { db } from '$lib/server/db';
// import { item } from '$lib/server/db/schema';
// import { error, fail } from '@sveltejs/kit';
// import type { Actions } from './$types';
// import { v4 as uuidv4 } from 'uuid';

// export const actions: Actions = {
// 	default: async ({ request }) => {
// 		try {
// 			const formData = await request.formData();
// 			const name = formData.get('name') as string;
// 			const baseUnit = formData.get('baseUnit') as 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
// 			const description = formData.get('description') as string;

// 			if (!name || !baseUnit) throw error(400, 'Nama dan Satuan wajib diisi');

// 			await db.insert(item).values({
// 				id: uuidv4(),
// 				name,
// 				type: 'CONSUMABLE',
// 				baseUnit,
// 				description,
// 				createdAt: new Date()
// 			});

// 			return { success: true, message: 'Peminjaman berhasil diajukan' };
// 		} catch (error) {
// 			console.error('Error creating lending:', err);
// 			return fail(500, { message: 'Gagal membuat pengajuan peminjaman' });
// 		}
// 	}
// };

import { db } from '$lib/server/db';
import { item, warehouse, organization, stock } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const orgResults = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, params.org_slug))
		.limit(1);

	if (orgResults.length === 0) {
		throw error(404, 'Organization not found');
	}

	const orgId = orgResults[0].id;

	const warehouses = await db
		.select()
		.from(warehouse)
		.where(eq(warehouse.organizationId, orgId));

	return {
		warehouses,
		org_slug: params.org_slug
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		try {
			const formData = await request.formData();
			const name = formData.get('name') as string;
			const baseUnit = formData.get('baseUnit') as 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
			const description = formData.get('description') as string;
			const warehouseId = formData.get('warehouseId') as string;
			const qty = formData.get('qty') as string;

			if (!name || !baseUnit) {
				return fail(400, { message: 'Nama dan Satuan dasar wajib diisi' });
			}

			const itemId = uuidv4();

			await db.transaction(async (tx) => {
				await tx.insert(item).values({
					id: itemId,
					name,
					type: 'CONSUMABLE',
					baseUnit,
					description,
					createdAt: new Date()
				});

				if (warehouseId && qty && parseFloat(qty) > 0) {
					await tx.insert(stock).values({
						id: uuidv4(),
						itemId,
						warehouseId,
						qty: parseFloat(qty).toString(),
						updatedAt: new Date()
					});
				}
			});

			return { success: true, message: 'Barang berhasil disimpan' };
		} catch (err) {
			console.error('Error creating item:', err);
			return fail(500, { message: 'Gagal menyimpan data barang' });
		}
	}
};
