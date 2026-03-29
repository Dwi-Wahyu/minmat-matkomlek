import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { movement, item, equipment } from '$lib/server/db/schema';
import { eq, desc, or, and, like } from 'drizzle-orm';

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ url, params, locals }) => {
	// Validasi Sesi & Organisasi
	if (!locals.user || !locals.user.organization) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}

	const { id: organizationId } = locals.user.organization;
	const searchName = url.searchParams.get('name');
	const searchType = url.searchParams.get('type'); // ASSET atau CONSUMABLE

	try {
		// Menyiapkan filter dasar
		let baseFilter = or(
			eq(movement.classification, 'BALKIR'),
			eq(movement.organizationId, organizationId)
		);

		// Kita menggunakan db.query dengan filter pada relasi jika memungkinkan, 
		// namun untuk filtering lintas tabel (item name) lebih akurat dengan join.
		// Namun untuk menjaga struktur 'with', kita akan tetap menggunakan findMany 
		// dan melakukan filter manual atau menggunakan subquery jika perlu.
		// Di sini kita akan gunakan pendekatan filter di 'where' dengan bantuan subquery/relasi.

		const movements = await db.query.movement.findMany({
			where: (movements, { and, or, eq, exists }) => {
				const conditions = [baseFilter];

				if (searchName || searchType) {
					conditions.push(
						or(
							// Filter untuk Consumable (langsung ke item)
							exists(
								db.select()
									.from(item)
									.where(
										and(
											eq(item.id, movement.itemId),
											searchName ? like(item.name, `%${searchName}%`) : undefined,
											searchType ? eq(item.type, searchType) : undefined
										)
									)
							),
							// Filter untuk Asset (lewat equipment)
							exists(
								db.select()
									.from(equipment)
									.innerJoin(item, eq(item.id, equipment.itemId))
									.where(
										and(
											eq(equipment.id, movement.equipmentId),
											searchName ? like(item.name, `%${searchName}%`) : undefined,
											searchType ? eq(item.type, searchType) : undefined
										)
									)
							)
						)
					);
				}

				return and(...conditions);
			},
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

		// Transformasi Data untuk Konsumsi Mobile
		const formattedMovements = movements.map((m) => {
			// Helper untuk menentukan nama organisasi (Internal vs Nama Org Lain)
			const displayOrgName =
				m.organizationId === organizationId ? 'Internal' : (m.organization?.name ?? 'Unknown');

			// Jika movement untuk Asset (punya equipment)
			if (m.equipment) {
				return {
					id: m.id,
					type: 'asset',
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
					fromWarehouse: m.fromWarehouse?.name,
					classification: m.classification,
					eventType: m.eventType
				};
			}

			// Jika movement untuk Consumable (punya item)
			if (m.item) {
				return {
					id: m.id,
					type: 'consumable',
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
					classification: m.classification,
					eventType: m.eventType
				};
			}

			// Fallback untuk data tidak dikenal
			return {
				id: m.id,
				type: 'unknown',
				nama: 'Unknown Item',
				qty: m.qty,
				tglMasuk: m.createdAt,
				organizationName: displayOrgName
			};
		});

		return json({
			success: true,
			data: formattedMovements
		});
	} catch (error) {
		console.error('API Balkir Error:', error);
		return json(
			{
				success: false,
				message: 'Internal Server Error'
			},
			{ status: 500 }
		);
	}
};
