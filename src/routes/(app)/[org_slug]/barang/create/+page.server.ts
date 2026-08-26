import { db } from '$lib/server/db';
import { item, warehouse, organization, stock } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import { uploadFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { itemSchema } from '$lib/schemas/item-schema';

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

	const warehouses = await db.select().from(warehouse).where(eq(warehouse.organizationId, orgId));

	const form = await superValidate(yup(itemSchema));

	return {
		warehouses,
		org_slug: params.org_slug,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, params }: any) => {
		const { org_slug } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(itemSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { name, baseUnit, description, warehouseId, qty } = form.data as {
			name: string;
			baseUnit: 'PCS' | 'BOX' | 'METER' | 'ROLL' | 'UNIT';
			description: string | null;
			warehouseId: string | null;
			qty: number | null;
		};

		const image = formData.get('image') as File;

		try {
			let imagePath = null;
			if (image && image.size > 0) {
				const uploadResult = await uploadFile(image, 'item');
				if (uploadResult.error) {
					return message(form, uploadResult.error, { status: 400 });
				}
				imagePath = uploadResult.fileName;
			}

			const itemId = uuidv4();

			await db.transaction(async (tx) => {
				await tx.insert(item).values({
					id: itemId,
					name,
					type: 'CONSUMABLE',
					baseUnit,
					description,
					imagePath,
					createdAt: new Date()
				});

				// Always create a stock entry (even with qty 0) to ensure isolation inner join works
				if (warehouseId) {
					await tx.insert(stock).values({
						id: uuidv4(),
						itemId,
						warehouseId,
						qty: (qty || 0).toString(),
						updatedAt: new Date()
					});
				}
			});

			// Invalidate cache
			const org = await db.query.organization.findFirst({
				where: eq(organization.slug, org_slug)
			});

			if (org) {
				await invalidateOrgInventoryCache(org.id);
			}

			return message(form, 'Barang berhasil disimpan');
		} catch (err) {
			console.error('Error creating item:', err);
			return message(form, 'Gagal menyimpan data barang', { status: 500 });
		}
	}
};
