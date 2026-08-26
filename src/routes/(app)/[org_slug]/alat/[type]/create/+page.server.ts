import { db } from '$lib/server/db';
import {
	equipment,
	item,
	warehouse,
	organization,
	movement,
	itemCategory
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { equipmentSchema } from '$lib/schemas/equipment-schema';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, type } = params;

	const [warehousesResults, orgResults, categories] = await Promise.all([
		db
			.select({ warehouse: warehouse })
			.from(warehouse)
			.innerJoin(organization, eq(warehouse.organizationId, organization.id))
			.where(eq(organization.slug, org_slug)),
		db.select().from(organization).where(eq(organization.slug, org_slug)).limit(1),
		db.query.itemCategory.findMany({
			with: { parent: true }
		})
	]);

	const form = await superValidate(yup(equipmentSchema));

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		org: orgResults[0] || null,
		type,
		categories,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { org_slug, type } = params;
		const formData = await request.formData();
		const form = await superValidate(formData, yup(equipmentSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const {
			itemName,
			serialNumber,
			brand,
			warehouseId,
			condition,
			status,
			classification,
			categoryId,
			newCategoryName,
			parentCategoryId,
			categoryMode
		} = form.data as {
			itemName: string;
			serialNumber: string | null;
			brand: string | null;
			warehouseId: string | null;
			condition: string;
			status: string;
			classification: string | null;
			categoryId: string | null;
			newCategoryName: string | null;
			parentCategoryId: string | null;
			categoryMode: 'select' | 'new';
		};

		// Get the raw form data for the image file
		const imageFile = formData.get('image') as File;

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'item');
		if (uploadError) {
			return message(form, uploadError, { status: 400 });
		}

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			const result = await db.transaction(async (tx) => {
				const orgResults = await tx
					.select()
					.from(organization)
					.where(eq(organization.slug, org_slug))
					.limit(1);

				if (orgResults.length === 0) {
					throw new Error('Organisasi tidak ditemukan');
				}
				const org = orgResults[0];

				// Handle dynamic category on-the-fly
				let finalCategoryId: string | null = categoryId;

				if (categoryMode === 'new' && newCategoryName) {
					// Check if category already exists
					const existingCat = await tx.query.itemCategory.findFirst({
						where: eq(itemCategory.name, newCategoryName)
					});

					if (existingCat) {
						finalCategoryId = existingCat.id;
					} else {
						finalCategoryId = crypto.randomUUID();
						await tx.insert(itemCategory).values({
							id: finalCategoryId,
							name: newCategoryName,
							parentId: parentCategoryId || null,
							order: 0,
							createdAt: new Date()
						});
					}
				}

				// Create or Find Item
				let itemId: string;
				const existingItemResults = await tx
					.select()
					.from(item)
					.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
					.limit(1);

				if (existingItemResults.length > 0) {
					itemId = existingItemResults[0].id;
					// Update image or categoryId if new details provided
					const updateData: any = {};
					if (fileName) updateData.imagePath = fileName;
					if (finalCategoryId) updateData.categoryId = finalCategoryId;

					if (Object.keys(updateData).length > 0) {
						await tx.update(item).set(updateData).where(eq(item.id, itemId));
					}
				} else {
					itemId = crypto.randomUUID();
					await tx.insert(item).values({
						id: itemId,
						name: itemName,
						type: 'ASSET',
						equipmentType: equipmentType,
						baseUnit: 'UNIT',
						categoryId: finalCategoryId,
						imagePath: fileName,
						createdAt: new Date()
					});
				}

				const equipmentId = crypto.randomUUID();
				await tx.insert(equipment).values({
					id: equipmentId,
					itemId,
					serialNumber: serialNumber || null,
					brand: brand || null,
					warehouseId: warehouseId || null,
					organizationId: org.id,
					condition: (condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') || 'BAIK',
					status: (status as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE') || 'READY',
					createdAt: new Date()
				});

				// Create movement record if classification is provided
				if (classification) {
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						itemId,
						equipmentId,
						eventType: 'RECEIVE',
						qty: '1.0000',
						classification: classification as 'BALKIR' | 'KOMUNITY' | 'TRANSITO',
						toWarehouseId: warehouseId || null,
						organizationId: org.id,
						picId: locals.user?.id,
						notes: `Penambahan alat baru dengan klasifikasi ${classification}`,
						createdAt: new Date()
					});

					await tx
						.update(equipment)
						.set({
							classification: classification as 'BALKIR' | 'KOMUNITY' | 'TRANSITO'
						})
						.where(eq(equipment.id, equipmentId));
				}

				return org.id;
			});

			// Invalidate cache
			await invalidateOrgInventoryCache(result);

			return message(form, 'Alat berhasil ditambahkan');
		} catch (error: any) {
			console.error(error);

			if (error.cause && error.cause.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}

			if (
				error.cause &&
				error.cause.sqlMessage &&
				error.cause.sqlMessage.includes('Duplicate entry')
			) {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}

			if (error.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}
			return message(form, error.message || 'Gagal menambahkan alat', { status: 500 });
		}
	}
};
