import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, itemCategory } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, error } from '@sveltejs/kit';
import { uploadFile, deleteFile } from '$lib/server/storage';
import { invalidateOrgInventoryCache } from '$lib/server/redis';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { yup } from 'sveltekit-superforms/adapters';
import { equipmentSchema } from '$lib/schemas/equipment-schema';

export const load: PageServerLoad = async ({ params }) => {
	const { org_slug, id } = params;

	const [warehousesResults, currentEquipmentResults, categories] = await Promise.all([
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
			.limit(1),
		db.query.itemCategory.findMany({
			with: { parent: true }
		})
	]);

	if (currentEquipmentResults.length === 0) {
		throw error(404, 'Alat tidak ditemukan');
	}

	const currentEquipment = {
		...currentEquipmentResults[0].equipment,
		item: currentEquipmentResults[0].item
	};

	const form = await superValidate(
		{
			itemName: currentEquipment.item.name,
			serialNumber: currentEquipment.serialNumber ?? undefined,
			brand: currentEquipment.brand ?? undefined,
			warehouseId: currentEquipment.warehouseId ?? undefined,
			condition: currentEquipment.condition,
			status: currentEquipment.status ?? undefined,
			categoryId: currentEquipment.item.categoryId ?? undefined
		},
		yup(equipmentSchema)
	);

	return {
		warehouses: warehousesResults.map((w) => w.warehouse),
		equipment: currentEquipment,
		type: params.type,
		categories,
		form
	};
};

export const actions: Actions = {
	default: async ({ request, params }: any) => {
		const { id, type } = params;
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
			categoryId: string | null;
			newCategoryName: string | null;
			parentCategoryId: string | null;
			categoryMode: 'select' | 'new';
		};

		const finalStatus = condition === 'RUSAK_TOTAL' ? 'DISPOSED' : status;

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			const resultOrgId = await db.transaction(async (tx) => {
				// Get current equipment
				const currentResults = await tx
					.select({
						equipment: equipment,
						item: item
					})
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(eq(equipment.id, id))
					.limit(1);

				if (currentResults.length === 0) {
					throw new Error('Alat tidak ditemukan');
				}
				const current = currentResults[0];

				// Get image file
				const imageFile = formData.get('image') as File;
				let imagePath = current.item.imagePath;

				// Upload new image if exists
				if (imageFile && imageFile.size > 0) {
					const { fileName: newFileName, error: uploadError } = await uploadFile(imageFile, 'item');
					if (uploadError) {
						throw new Error(uploadError);
					}

					// Delete old image if new one is uploaded
					if (current.item.imagePath) {
						deleteFile(current.item.imagePath, 'item');
					}
					imagePath = newFileName;
				}

				// Handle dynamic category on-the-fly
				let finalCategoryId: string | null = categoryId;

				if (categoryMode === 'new' && newCategoryName) {
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

				// Find or Create Item (Jika Nama Berubah)
				let itemId: string;
				const existingItemResults = await tx
					.select()
					.from(item)
					.where(and(eq(item.name, itemName), eq(item.equipmentType, equipmentType)))
					.limit(1);

				if (existingItemResults.length > 0) {
					itemId = existingItemResults[0].id;
					// Update existing item details
					const updateData: any = {};
					if (imageFile && imageFile.size > 0) updateData.imagePath = imagePath;
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
						imagePath: imagePath,
						createdAt: new Date()
					});
				}

				await tx
					.update(equipment)
					.set({
						itemId,
						serialNumber: serialNumber || null,
						brand: brand || null,
						warehouseId: warehouseId || null,
						condition: (condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') || 'BAIK',
						status:
							(finalStatus as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE' | 'DISPOSED') ||
							'READY',
						updatedAt: new Date()
					})
					.where(eq(equipment.id, id));

				return current.equipment.organizationId!;
			});

			// Invalidate cache
			await invalidateOrgInventoryCache(resultOrgId);

			return message(form, 'Data alat berhasil diperbarui');
		} catch (error: any) {
			console.error(error);
			if (error.code === 'ER_DUP_ENTRY') {
				return setError(form, 'serialNumber', 'Serial Number sudah terdaftar');
			}
			return message(form, error.message || 'Gagal memperbarui data alat', { status: 500 });
		}
	}
};
