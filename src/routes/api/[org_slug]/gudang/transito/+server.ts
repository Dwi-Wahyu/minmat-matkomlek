import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { movement, item, equipment } from '$lib/server/db/schema';
import { eq, desc, and, like, or, exists, sql } from 'drizzle-orm';
import { getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

/** @type {import('./$types').RequestHandler} */
export const GET: import('./$types').RequestHandler = async ({ url, params, locals }) => {
	// Validasi Sesi & Organisasi
	if (!locals.user || !locals.user.organization) {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const { id: organizationId } = locals.user.organization;
	const searchName = url.searchParams.get('name');
	const searchType = url.searchParams.get('type'); // ASSET atau CONSUMABLE

	const page = Number(url.searchParams.get('page')) || 1;
	const limit = Number(url.searchParams.get('limit')) || 10;
	const hasPagination = url.searchParams.has('page') || url.searchParams.has('limit');

	try {
		// Hanya cache request tanpa filter (list penuh) dan tanpa paginasi
		if (!searchName && !searchType && !hasPagination) {
			const cacheKey = CacheKeys.gudangTransito(organizationId);
			const data = await getOrSetCache(
				cacheKey,
				async () => {
					const movements = await db.query.movement.findMany({
						where: and(
							eq(movement.classification, 'TRANSITO'),
							eq(movement.organizationId, organizationId)
						),
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

					return movements.map((m) => {
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
						} else if (m.item) {
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
						return {
							id: m.id,
							type: 'unknown',
							nama: 'Unknown Item',
							qty: m.qty,
							notes: m.notes,
							createdAt: m.createdAt
						};
					});
				},
				CacheTTL.GUDANG
			);

			return json({ success: true, data });
		}

		// Jika ada filter, langsung query DB tanpa cache
		const movements = await db.query.movement.findMany({
			where: (movements, { and, eq, exists }) => {
				const conditions = [
					eq(movement.classification, 'TRANSITO'),
					eq(movement.organizationId, organizationId)
				];

				if (searchName || searchType) {
					conditions.push(
						or(
							exists(
								db
									.select()
									.from(item)
									.where(
										and(
											eq(item.id, movement.itemId),
											searchName ? like(item.name, `%${searchName}%`) : (sql`TRUE` as any),
											searchType ? eq(item.type, searchType as any) : (sql`TRUE` as any)
										)
									)
							) as any,
							exists(
								db
									.select()
									.from(equipment)
									.innerJoin(item, eq(item.id, equipment.itemId))
									.where(
										and(
											eq(equipment.id, movement.equipmentId),
											searchName ? like(item.name, `%${searchName}%`) : (sql`TRUE` as any),
											searchType ? eq(item.type, searchType as any) : (sql`TRUE` as any)
										)
									)
							) as any
						) as any
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

		const formattedMovements = movements.map((m) => {
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
			} else if (m.item) {
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
			return {
				id: m.id,
				type: 'unknown',
				nama: 'Unknown Item',
				qty: m.qty,
				notes: m.notes,
				createdAt: m.createdAt
			};
		});

		const totalItems = formattedMovements.length;
		const totalPages = Math.ceil(totalItems / limit);
		const startIndex = (page - 1) * limit;
		const paginatedItems = formattedMovements.slice(startIndex, startIndex + limit);

		return json({
			success: true,
			data: paginatedItems,
			pagination: {
				page,
				limit,
				totalItems,
				totalPages
			}
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
