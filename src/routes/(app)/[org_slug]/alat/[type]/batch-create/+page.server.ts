import { db } from '$lib/server/db';
import {
	equipment,
	item,
	warehouse,
	organization,
	movement,
	lending,
	lendingItem,
	distribution,
	distributionEquipment,
	auditLog,
	itemCategory
} from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { invalidateOrgInventoryCache } from '$lib/server/redis';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { org_slug, type } = params;
	const { user } = locals;

	if (!user) {
		throw redirect(302, '/');
	}

	// Cari organisasi induk berdasarkan slug di URL
	const currentOrg = await db.query.organization.findFirst({
		where: eq(organization.slug, user.organization.slug)
	});

	if (!currentOrg) {
		throw error(404, 'Organisasi tidak ditemukan');
	}

	// Map URL type to database equipmentType
	const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

	// Load items
	const items = await db.query.item.findMany({
		where: and(eq(item.type, 'ASSET'), eq(item.equipmentType, equipmentType)),
		orderBy: [asc(item.name)]
	});

	// Load warehouses for current organization
	const warehouses = await db.query.warehouse.findMany({
		where: eq(warehouse.organizationId, currentOrg.id),
		orderBy: [asc(warehouse.name)]
	});

	// Load sub units (Satuan Jajaran - Level 3)
	const subUnits = await db.query.organization.findMany({
		where: eq(organization.parentId, currentOrg.id),
		orderBy: [asc(organization.name)]
	});

	// Get role restriction from locals
	// user.warehouseHeadType: 'TRANSITO' | 'BALKIR' | 'KOMUNITY' | null
	const warehouseHeadType = user.warehouseHeadType || null;

	const categories = await db.query.itemCategory.findMany({
		with: { parent: true }
	});

	return {
		items,
		warehouses,
		subUnits,
		warehouseHeadType,
		type,
		currentOrg,
		categories
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const { type } = params;
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const newItemName = formData.get('newItemName') as string;
		const brand = formData.get('brand') as string;
		const rawRows = formData.get('rows') as string;
		const categoryId = formData.get('categoryId') as string;
		const newCategoryName = formData.get('newCategoryName') as string;
		const parentCategoryId = formData.get('parentCategoryId') as string;
		const categoryMode = formData.get('categoryMode') as string;

		if (!itemId && !newItemName) {
			return fail(400, { message: 'Jenis alat wajib dipilih atau diisi nama baru' });
		}
		if (!rawRows) {
			return fail(400, { message: 'Data baris alat tidak ditemukan' });
		}

		let rows: Array<{
			serialNumber: string;
			classification: 'BALKIR' | 'KOMUNITY' | 'TRANSITO';
			condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'RUSAK_TOTAL';
			subUnitId: string | null;
			subUnitName: string | null;
		}>;

		try {
			rows = JSON.parse(rawRows);
		} catch (err) {
			return fail(400, { message: 'Format data baris alat tidak valid' });
		}

		if (rows.length === 0) {
			return fail(400, { message: 'Minimal masukkan 1 alat' });
		}

		// Validasi duplikasi serial number di input frontend
		const serials = rows.map((r) => r.serialNumber.trim()).filter(Boolean);
		const uniqueSerials = new Set(serials);
		if (serials.length !== uniqueSerials.size) {
			return fail(400, { message: 'Serial Number di baris input tidak boleh duplikat' });
		}

		// Cari organisasi induk
		const currentOrg = await db.query.organization.findFirst({
			where: eq(organization.slug, user.organization.slug)
		});

		if (!currentOrg) {
			return fail(404, { message: 'Organisasi aktif tidak ditemukan' });
		}

		// Cari default warehouse
		const defaultWarehouse = await db.query.warehouse.findFirst({
			where: eq(warehouse.organizationId, currentOrg.id)
		});

		if (!defaultWarehouse) {
			return fail(400, {
				message:
					'Gudang default tidak ditemukan. Silahkan buat gudang terlebih dahulu di menu Infrastruktur.'
			});
		}

		// Map URL type to database equipmentType
		const equipmentType = type.toUpperCase() === 'ALPERNIKA' ? 'PERNIKA_LEK' : 'ALKOMLEK';

		try {
			await db.transaction(async (tx) => {
				const lendingsMap = new Map<string, string>(); // subUnitId -> lendingId
				const transitoDists = new Map<string, string[]>(); // subUnitId -> [equipmentId]

				// Tentukan itemId final
				let finalItemId = itemId;
				let finalCategoryId = categoryId;

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

				if (!finalItemId && newItemName) {
					// Cari apakah item sudah ada berdasarkan nama dan tipe alkomlek/alpernika
					const existingItem = await tx.query.item.findFirst({
						where: and(eq(item.name, newItemName), eq(item.equipmentType, equipmentType))
					});

					if (existingItem) {
						finalItemId = existingItem.id;
						if (finalCategoryId && !existingItem.categoryId) {
							await tx
								.update(item)
								.set({ categoryId: finalCategoryId })
								.where(eq(item.id, finalItemId));
						}
					} else {
						finalItemId = crypto.randomUUID();
						await tx.insert(item).values({
							id: finalItemId,
							name: newItemName,
							type: 'ASSET',
							equipmentType: equipmentType,
							baseUnit: 'UNIT',
							categoryId: finalCategoryId || null,
							createdAt: new Date()
						});
					}
				}

				for (const row of rows) {
					const serialNumber = row.serialNumber.trim();
					if (!serialNumber) {
						throw new Error('Semua Serial Number wajib diisi');
					}

					// Cek duplikasi Serial Number di database
					const existing = await tx.query.equipment.findFirst({
						where: eq(equipment.serialNumber, serialNumber)
					});

					if (existing) {
						throw new Error(`Serial Number "${serialNumber}" sudah terdaftar di sistem.`);
					}

					const equipmentId = crypto.randomUUID();
					const isLent = !!row.subUnitId;
					const isTransitoHead = user.warehouseHeadType === 'TRANSITO';

					// 4.1 Insert ke tabel equipment
					await tx.insert(equipment).values({
						id: equipmentId,
						serialNumber,
						brand: brand || null,
						warehouseId: defaultWarehouse.id,
						organizationId: currentOrg.id,
						itemId: finalItemId,
						condition: row.condition,
						status: isLent && !isTransitoHead ? 'IN_USE' : 'READY', // TRANSITO remains READY
						classification: row.classification,
						createdAt: new Date()
					});

					// 4.3 Record Histori ke tabel movement: event RECEIVE
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						itemId: finalItemId,
						equipmentId,
						eventType: 'RECEIVE',
						qty: '1.0000',
						classification: row.classification,
						toWarehouseId: defaultWarehouse.id,
						organizationId: currentOrg.id,
						picId: user.id,
						notes: `Batch Input Alat: Penerimaan materiil baru`,
						createdAt: new Date()
					});

					// Jika dipinjamkan / didistribusikan ke Satuan Jajaran
					if (row.subUnitId && row.subUnitName) {
						if (isTransitoHead) {
							// Kumpulkan untuk dicatat sebagai distribusi nanti
							let list = transitoDists.get(row.subUnitId);
							if (!list) {
								list = [];
								transitoDists.set(row.subUnitId, list);
							}
							list.push(equipmentId);
						} else {
							// LENDING biasa
							let lendingId = lendingsMap.get(row.subUnitId);

							// 4.2 Record Peminjaman ke tabel lending
							if (!lendingId) {
								lendingId = crypto.randomUUID();
								lendingsMap.set(row.subUnitId, lendingId);

								await tx.insert(lending).values({
									id: lendingId,
									unit: row.subUnitName,
									purpose: 'OPERASI',
									status: 'DIPINJAM',
									organizationId: currentOrg.id,
									requestedBy: user.id,
									startDate: new Date(),
									createdAt: new Date()
								});
							}

							// Insert ke lending_item
							await tx.insert(lendingItem).values({
								id: crypto.randomUUID(),
								lendingId,
								equipmentId
							});

							// 4.3 Record Histori ke tabel movement: event LOAN_OUT
							await tx.insert(movement).values({
								id: crypto.randomUUID(),
								itemId: finalItemId,
								equipmentId,
								eventType: 'LOAN_OUT',
								qty: '1.0000',
								classification: row.classification,
								fromWarehouseId: defaultWarehouse.id,
								toWarehouseId: null,
								organizationId: currentOrg.id,
								picId: user.id,
								notes: `Dipinjamkan ke satuan jajaran: ${row.subUnitName}`,
								createdAt: new Date()
							});
						}
					}
				}

				// Buat Pengajuan Distribusi untuk TRANSITO
				if (user.warehouseHeadType === 'TRANSITO' && transitoDists.size > 0) {
					for (const [subId, eqpIds] of transitoDists.entries()) {
						const distId = crypto.randomUUID();
						const isAutoValidated = [
							'operatorBinmatDanBekharrah',
							'operatorPusatDanDaerah',
							'superadmin'
						].includes(user.role);
						const initialStatus = isAutoValidated ? 'VALIDATED' : 'DRAFT';

						// Insert ke distribution
						await tx.insert(distribution).values({
							id: distId,
							fromOrganizationId: currentOrg.id,
							toOrganizationId: subId,
							requestedBy: user.id,
							status: initialStatus,
							createdAt: new Date()
						});

						// Insert ke distributionEquipment
						for (const eqpId of eqpIds) {
							await tx.insert(distributionEquipment).values({
								id: crypto.randomUUID(),
								distributionId: distId,
								equipmentId: eqpId,
								note: 'Batch Input TRANSITO',
								createdAt: new Date()
							});
						}

						// Audit Log
						await tx.insert(auditLog).values({
							id: crypto.randomUUID(),
							userId: user.id,
							action: 'CREATE',
							tableName: 'distribution',
							recordId: distId,
							newValue: JSON.stringify({ status: initialStatus, itemsCount: eqpIds.length }),
							createdAt: new Date()
						});
					}
				}
			});

			// Invalidate cache
			await invalidateOrgInventoryCache(currentOrg.id);

			return { success: true, message: 'Batch alat berhasil disimpan ke database' };
		} catch (err: any) {
			console.error('Error during batch create transaction:', err);
			return fail(500, { message: err.message || 'Gagal menyimpan batch alat ke database' });
		}
	}
};
