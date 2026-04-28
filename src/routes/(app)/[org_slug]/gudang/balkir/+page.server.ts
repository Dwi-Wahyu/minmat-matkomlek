import { db } from '$lib/server/db';
import { movement, equipment, item } from '$lib/server/db/schema';
import { eq, desc, and, isNotNull, isNull } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, locals }) => {
	const userOrg = locals.user.organization;
	if (!userOrg?.id) {
		return { movements: [], organizations: [], isMabes: false, selectedOrgId: '' };
	}

	const isMabes = userOrg.parentId === null;
	const selectedOrgId = url.searchParams.get('orgId') || userOrg.id;

	// Fetch all organizations if user is Mabes
	const orgs = isMabes ? await db.query.organization.findMany() : [];

	const movements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'BALKIR'),
			eq(movement.organizationId, selectedOrgId)
		),
		with: {
			equipment: {
				with: {
					item: true,
					warehouse: true
				}
			},
			organization: {
				columns: { name: true }
			},
			fromWarehouse: {
				columns: { name: true }
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	// Filter: Hanya tampilkan jika barang tersebut MASIH berada di state balkir
	// Untuk Asset/Equipment: Cek apakah warehouseId-nya masih sesuai atau sudah NULL (karena ISSUE)
	const activeMovements = movements.filter((m) => {
		if (m.equipment) {
			// Jika barang sudah di-ISSUE (warehouseId null), jangan tampilkan lagi di daftar "Menunggu"
			// Kecuali jika ini adalah record ISSUE itu sendiri (tapi query kita filter classification='BALKIR')
			return m.equipment.warehouseId !== null || m.eventType !== 'ISSUE';
		}
		return true;
	});

	return {
		movements: activeMovements.map((m) => {
			const displayOrgName =
				m.organizationId === userOrg.id ? 'Internal' : (m.organization?.name ?? 'Unknown');

			if (m.equipment) {
				return {
					id: m.id,
					equipmentId: m.equipment.id,
					type: 'asset' as const,
					nama: m.equipment.item.name,
					tipe: m.equipment.item.type,
					kategori: m.equipment.item.equipmentType,
					sn: m.equipment.serialNumber,
					qty: m.qty,
					satuan: m.equipment.item.baseUnit,
					kondisi: m.equipment.condition,
					lokasi: m.specificLocationName,
					tglMasuk: m.createdAt,
					organizationName: displayOrgName,
					fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
					classification: m.classification
				};
			}

			if (m.item) {
				return {
					id: m.id,
					itemId: m.item.id,
					type: 'consumable' as const,
					nama: m.item.name,
					tipe: m.item.type,
					kategori: null,
					sn: null,
					qty: m.qty,
					satuan: m.item.baseUnit,
					kondisi: null,
					lokasi: m.specificLocationName,
					tglMasuk: m.createdAt,
					organizationName: displayOrgName,
					fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar',
					classification: m.classification
				};
			}

			return {
				id: m.id,
				type: 'unknown' as const,
				nama: 'Unknown',
				tipe: null,
				kategori: null,
				sn: null,
				qty: m.qty,
				satuan: null,
				kondisi: null,
				lokasi: m.specificLocationName,
				tglMasuk: m.createdAt,
				organizationName: displayOrgName,
				fromWarehouse: m.fromWarehouse?.name || 'Pusat/Luar'
			};
		}),
		organizations: orgs,
		isMabes: isMabes,
		selectedOrgId: selectedOrgId
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const movementId = formData.get('id') as string;

		try {
			await db.transaction(async (tx) => {
				// 1. Cari record mutasi balkir
				const currentMovement = await tx.query.movement.findFirst({
					where: eq(movement.id, movementId),
					with: {
						equipment: true
					}
				});

				if (!currentMovement) throw new Error('Data mutasi tidak ditemukan');

				// 2. Jika barang adalah Asset (Equipment)
				if (currentMovement.equipmentId) {
					// Update status alat menjadi tidak ada di gudang (ISSUE)
					await tx
						.update(equipment)
						.set({
							warehouseId: null,
							status: 'READY' // Tetap READY tapi tanpa gudang (artinya keluar sistem)
						})
						.where(eq(equipment.id, currentMovement.equipmentId));

					// Catat mutasi ISSUE
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						equipmentId: currentMovement.equipmentId,
						organizationId: user.organization.id,
						eventType: 'ISSUE',
						classification: null,
						qty: '1.0000',
						fromWarehouseId: currentMovement.toWarehouseId || currentMovement.fromWarehouseId,
						notes: 'Penghapusan permanen dari Gudang Balkir',
						picId: user.id,
						createdAt: new Date()
					});
				}

				// 3. Update original movement agar tidak muncul di list Balkir (opsional/tergantung filter load)
				await tx
					.update(movement)
					.set({ classification: null })
					.where(eq(movement.id, movementId));
			});

			return { success: true, message: 'Barang berhasil dihapus permanen dari sistem' };
		} catch (error) {
			console.error('Error deleting from balkir:', error);
			return fail(500, { message: 'Gagal memproses penghapusan barang' });
		}
	}
};
