import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { movement, item, equipment } from '$lib/server/db/schema';
import { eq, desc, or, and, like } from 'drizzle-orm';
import { getOrSetCache, CacheKeys, CacheTTL } from '$lib/server/redis';

/** @type {import('./$types').RequestHandler} */
export const GET: import('./$types').RequestHandler = async ({ url, params, locals }) => {
	// Validasi Sesi & Organisasi
	if (!locals.user || !locals.user.organization) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
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
			const cacheKey = CacheKeys.gudangBalkir(organizationId);
			const data = await getOrSetCache(
				cacheKey,
				async () => {
					const movements = await db.query.movement.findMany({
						where: (movements, { and, or, eq }) => {
							return or(
								eq(movements.classification, 'BALKIR'),
								eq(movements.organizationId, organizationId)
							);
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

					return movements.map((m) => {
						const displayOrgName =
							m.organizationId === organizationId
								? 'Internal'
								: (m.organization?.name ?? 'Unknown');

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

						return {
							id: m.id,
							type: 'unknown',
							nama: 'Unknown Item',
							qty: m.qty,
							tglMasuk: m.createdAt,
							organizationName: displayOrgName
						};
					});
				},
				CacheTTL.GUDANG
			);

			return json({ success: true, data });
		}

		// Jika ada filter, langsung query DB tanpa cache
		const movements = await db.query.movement.findMany({
			where: (movements, { and, or, eq, exists }) => {
				const conditions = [
					or(eq(movements.classification, 'BALKIR'), eq(movements.organizationId, organizationId))
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
											searchName ? like(item.name, `%${searchName}%`) : undefined,
											searchType ? eq(item.type, searchType as any) : undefined
										)
									)
							),
							exists(
								db
									.select()
									.from(equipment)
									.innerJoin(item, eq(item.id, equipment.itemId))
									.where(
										and(
											eq(equipment.id, movement.equipmentId),
											searchName ? like(item.name, `%${searchName}%`) : undefined,
											searchType ? eq(item.type, searchType as any) : undefined
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

		const formattedMovements = movements.map((m) => {
			const displayOrgName =
				m.organizationId === organizationId ? 'Internal' : (m.organization?.name ?? 'Unknown');

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

			return {
				id: m.id,
				type: 'unknown',
				nama: 'Unknown Item',
				qty: m.qty,
				tglMasuk: m.createdAt,
				organizationName: displayOrgName
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
