import { db } from '$lib/server/db';
import { movement } from '@/server/db/schema.js';
import { eq, desc, and, or } from 'drizzle-orm'; // Tambahkan 'or'

export const load = async ({ params, locals }) => {
	const { organizationId } = locals.user; // Pastikan cara ambil ID ini benar sesuai auth provider Anda

	if (!organizationId) {
		return { movements: [] };
	}

	const movements = await db.query.movement.findMany({
		// LOGIKA FILTER:
		// (classification == 'BALKIR') ATAU (organizationId == milik_user)
		where: or(eq(movement.classification, 'BALKIR'), eq(movement.organizationId, organizationId)),
		with: {
			equipment: {
				with: {
					item: true
				}
			},
			organization: {
				columns: {
					name: true
				}
			},
			fromWarehouse: {
				columns: {
					name: true
				}
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	return {
		movements: movements.map((m) => {
			// Helper untuk menentukan nama organisasi
			const displayOrgName =
				m.organizationId === organizationId ? 'Internal' : (m.organization?.name ?? 'Unknown');

			if (m.equipment) {
				return {
					id: m.id,
					type: 'asset' as const,
					nama: m.equipment.item.name,
					tipe: m.equipment.item.type,
					kategori: m.equipment.item.equipmentType, // Perbaikan: ambil dari item milik equipment
					sn: m.equipment.serialNumber,
					qty: m.qty,
					satuan: m.equipment.item.baseUnit,
					kondisi: m.equipment.condition,
					lokasi: m.specificLocationName,
					tglMasuk: m.createdAt,
					organizationName: displayOrgName,
					fromWarehouse: m.fromWarehouse?.name,
					classification: m.classification // Menambahkan info classification di return
				};
			}

			if (m.item) {
				return {
					id: m.id,
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
					fromWarehouse: m.fromWarehouse?.name,
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
				fromWarehouse: m.fromWarehouse?.name
			};
		})
	};
};
