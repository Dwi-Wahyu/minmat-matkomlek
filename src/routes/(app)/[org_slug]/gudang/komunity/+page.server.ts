import { db } from '$lib/server/db';
import { movement, equipment, user } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { id: organizationId } = locals.user.organization;

	if (!organizationId) {
		return {
			items: []
		};
	}

	// Get all equipment with their movements for KOMUNITY classification
	const equipmentList = await db.query.equipment.findMany({
		where: eq(equipment.organizationId, organizationId),
		with: {
			item: true,
			movements: {
				where: eq(movement.classification, 'KOMUNITY'),
				orderBy: [desc(movement.createdAt)]
			}
		}
	});

	// Transform data to match table structure
	const items = equipmentList.map((equip) => {
		// Calculate totals from movements
		let totalMasuk = 0;
		let totalKeluar = 0;

		// Track latest condition from movements (or use equipment condition)
		let latestCondition = equip.condition;

		equip.movements.forEach((m) => {
			if (m.eventType === 'RECEIVE') {
				totalMasuk += m.qty;
			} else if (m.eventType === 'ISSUE') {
				totalKeluar += m.qty;
			}

			// Update condition if movement has condition info
			if (m.notes?.includes('kondisi')) {
				// Logic to update condition from movement notes
			}
		});

		const stok = totalMasuk - totalKeluar;

		// Determine condition breakdown
		// Based on equipment condition and movement history
		let sisaBaik = 0;
		let sisaRR = 0;
		let sisaRB = 0;

		if (equip.condition === 'BAIK') {
			sisaBaik = stok;
		} else if (equip.condition === 'RUSAK_RINGAN') {
			sisaRR = stok;
		} else if (equip.condition === 'RUSAK_BERAT') {
			sisaRB = stok;
		}

		return {
			id: equip.id,
			matkomplek: equip.serialNumber,
			namaBarang: equip.item.name,
			stok: stok,
			masuk: totalMasuk,
			keluar: totalKeluar,
			sisaBaik: sisaBaik,
			sisaRR: sisaRR,
			sisaRB: sisaRB,
			kondisi: equip.condition,
			// keterangan: equip.item.description || '-',
			keterangan: '-',
			tahun: new Date(equip.createdAt).getFullYear(),
			equipmentType: equip.item.equipmentType,
			baseUnit: equip.item.baseUnit
		};
	});

	// Filter only items with stock > 0 or has movements
	const filteredItems = items.filter((item) => item.stok > 0 || item.masuk > 0 || item.keluar > 0);

	return {
		items: filteredItems
	};
};
