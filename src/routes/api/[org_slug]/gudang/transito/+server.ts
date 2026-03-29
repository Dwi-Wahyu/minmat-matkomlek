import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { movement, item, equipment } from '$lib/server/db/schema';
import { eq, desc, and, like, or } from 'drizzle-orm';

/** @type {import('./$types').RequestHandler} */
export const GET = async ({ url, params, locals }) => {
	// Validasi Sesi & Organisasi
	if (!locals.user || !locals.user.organization) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { id: organizationId } = locals.user.organization;
	const searchName = url.searchParams.get('name');
	const searchType = url.searchParams.get('type'); // ASSET atau CONSUMABLE

	try {
		// Query Data Movement dengan Klasifikasi 'TRANSITO' dan filter tambahan
		const movements = await db.query.movement.findMany({
			where: (movements, { and, eq, exists }) => {
				const conditions = [
					eq(movement.classification, 'TRANSITO'),
					eq(movement.organizationId, organizationId)
				];

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
				item: true
			},
			orderBy: [desc(movement.createdAt)]
		});

		// Transformasi Data untuk Konsumsi Mobile (Clean JSON)
		const formattedMovements = movements.map((m) => {
			// Jika movement terkait alat/asset (memiliki data equipment)
			if (m.equipment && m.equipment.item) {
				return {
					id: m.id,
					type: 'asset',
					nama: m.equipment.item.name,
					serialNumber: m.equipment.serialNumber,
					kategori: m.equipment.item.equipmentType,
					notes: m.notes,
					qty: m.qty,
					createdAt: m.createdAt,
					eventType: m.eventType
				};
			}
			// Jika movement terkait bahan/consumable (hanya memiliki data item)
			else if (m.item) {
				return {
					id: m.id,
					type: 'consumable',
					nama: m.item.name,
					kategori: null,
					notes: m.notes,
					qty: m.qty,
					unit: m.unit || m.item.baseUnit,
					createdAt: m.createdAt,
					eventType: m.eventType
				};
			}
			// Fallback
			return {
				id: m.id,
				type: 'unknown',
				nama: 'Unknown Item',
				qty: m.qty,
				notes: m.notes,
				createdAt: m.createdAt
			};
		});

		// Return Response
		return json({
			success: true,
			data: formattedMovements
		});
	} catch (error) {
		console.error('API Transito Error:', error);
		return json(
			{
				success: false,
				message: 'Internal Server Error'
			},
			{ status: 500 }
		);
	}
};
