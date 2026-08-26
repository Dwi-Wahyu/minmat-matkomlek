import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { movement, equipment, item } from '$lib/server/db/schema';
import { eq, desc, and, like, or } from 'drizzle-orm';
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
			const cacheKey = CacheKeys.gudangKomunity(organizationId);
			const data = await getOrSetCache(
				cacheKey,
				async () => {
					let results: any[] = [];

					// 1. Ambil DATA ASSET (Equipment)
					const equipmentList = await db.query.equipment.findMany({
						where: (equip, { and, eq }) => {
							return eq(equip.organizationId, organizationId);
						},
						with: {
							item: true,
							movements: {
								where: eq(movement.classification, 'KOMUNITY'),
								orderBy: [desc(movement.createdAt)]
							}
						}
					});

					const assetItems = equipmentList.map((equip) => {
						let totalMasuk = 0;
						let totalKeluar = 0;

						equip.movements.forEach((m) => {
							if (
								m.eventType === 'RECEIVE' ||
								m.eventType === 'TRANSFER_IN' ||
								m.eventType === 'DISTRIBUTE_IN'
							) {
								totalMasuk += Number(m.qty);
							} else if (
								m.eventType === 'ISSUE' ||
								m.eventType === 'TRANSFER_OUT' ||
								m.eventType === 'DISTRIBUTE_OUT'
							) {
								totalKeluar += Number(m.qty);
							}
						});

						const stok = totalMasuk - totalKeluar;
						let sisaBaik = 0,
							sisaRR = 0,
							sisaRB = 0;
						if (equip.condition === 'BAIK') sisaBaik = stok;
						else if (equip.condition === 'RUSAK_RINGAN') sisaRR = stok;
						else if (equip.condition === 'RUSAK_BERAT') sisaRB = stok;

						return {
							id: equip.id,
							type: 'ASSET',
							matkomplek: equip.serialNumber,
							namaBarang: equip.item.name,
							stok: stok,
							masuk: totalMasuk,
							keluar: totalKeluar,
							sisaBaik: sisaBaik,
							sisaRR: sisaRR,
							sisaRB: sisaRB,
							kondisi: equip.condition,
							keterangan: '-',
							tahun: new Date(equip.createdAt).getFullYear(),
							equipmentType: equip.item.equipmentType,
							baseUnit: equip.item.baseUnit
						};
					});
					results = [...results, ...assetItems];

					// 2. Ambil DATA CONSUMABLE
					const consumableMovements = await db.query.movement.findMany({
						where: and(
							eq(movement.classification, 'KOMUNITY'),
							eq(movement.organizationId, organizationId)
						),
						with: {
							item: true
						}
					});

					const consumableMap = new Map();
					consumableMovements.forEach((m) => {
						if (!m.item || m.item.type !== 'CONSUMABLE') return;

						if (!consumableMap.has(m.itemId)) {
							consumableMap.set(m.itemId, {
								id: m.itemId,
								type: 'CONSUMABLE',
								matkomplek: '-',
								namaBarang: m.item.name,
								stok: 0,
								masuk: 0,
								keluar: 0,
								sisaBaik: 0,
								sisaRR: 0,
								sisaRB: 0,
								kondisi: 'BAIK',
								keterangan: m.notes || '-',
								tahun: new Date(m.createdAt).getFullYear(),
								equipmentType: null,
								baseUnit: m.item.baseUnit
							});
						}

						const entry = consumableMap.get(m.itemId);
						if (
							m.eventType === 'RECEIVE' ||
							m.eventType === 'TRANSFER_IN' ||
							m.eventType === 'DISTRIBUTE_IN'
						) {
							entry.masuk += Number(m.qty);
						} else if (
							m.eventType === 'ISSUE' ||
							m.eventType === 'TRANSFER_OUT' ||
							m.eventType === 'DISTRIBUTE_OUT'
						) {
							entry.keluar += Number(m.qty);
						}
						entry.stok = entry.masuk - entry.keluar;
						entry.sisaBaik = entry.stok;
					});

					results = [...results, ...Array.from(consumableMap.values())];

					return results.filter((item) => item.stok > 0 || item.masuk > 0 || item.keluar > 0);
				},
				CacheTTL.GUDANG
			);

			return json({ success: true, data });
		}

		// Jika ada filter, langsung query DB tanpa cache
		let results: any[] = [];

		if (!searchType || searchType === 'ASSET') {
			const equipmentList = await db.query.equipment.findMany({
				where: (equip, { and, eq, exists }) => {
					const conds = [eq(equip.organizationId, organizationId)];
					if (searchName) {
						conds.push(
							exists(
								db
									.select()
									.from(item)
									.where(and(eq(item.id, equip.itemId), like(item.name, `%${searchName}%`)))
							)
						);
					}
					return and(...conds);
				},
				with: {
					item: true,
					movements: {
						where: eq(movement.classification, 'KOMUNITY'),
						orderBy: [desc(movement.createdAt)]
					}
				}
			});

			const assetItems = equipmentList.map((equip) => {
				let totalMasuk = 0;
				let totalKeluar = 0;

				equip.movements.forEach((m) => {
					if (
						m.eventType === 'RECEIVE' ||
						m.eventType === 'TRANSFER_IN' ||
						m.eventType === 'DISTRIBUTE_IN'
					) {
						totalMasuk += Number(m.qty);
					} else if (
						m.eventType === 'ISSUE' ||
						m.eventType === 'TRANSFER_OUT' ||
						m.eventType === 'DISTRIBUTE_OUT'
					) {
						totalKeluar += Number(m.qty);
					}
				});

				const stok = totalMasuk - totalKeluar;
				let sisaBaik = 0,
					sisaRR = 0,
					sisaRB = 0;
				if (equip.condition === 'BAIK') sisaBaik = stok;
				else if (equip.condition === 'RUSAK_RINGAN') sisaRR = stok;
				else if (equip.condition === 'RUSAK_BERAT') sisaRB = stok;

				return {
					id: equip.id,
					type: 'ASSET',
					matkomplek: equip.serialNumber,
					namaBarang: equip.item.name,
					stok: stok,
					masuk: totalMasuk,
					keluar: totalKeluar,
					sisaBaik: sisaBaik,
					sisaRR: sisaRR,
					sisaRB: sisaRB,
					kondisi: equip.condition,
					keterangan: '-',
					tahun: new Date(equip.createdAt).getFullYear(),
					equipmentType: equip.item.equipmentType,
					baseUnit: equip.item.baseUnit
				};
			});
			results = [...results, ...assetItems];
		}

		if (!searchType || searchType === 'CONSUMABLE') {
			const consumableMovements = await db.query.movement.findMany({
				where: and(
					eq(movement.classification, 'KOMUNITY'),
					eq(movement.organizationId, organizationId),
					searchName ? or(like(movement.notes, `%${searchName}%`)) : undefined
				),
				with: {
					item: true
				}
			});

			const consumableMap = new Map();
			consumableMovements.forEach((m) => {
				if (!m.item || m.item.type !== 'CONSUMABLE') return;
				if (searchName && !m.item.name.toLowerCase().includes(searchName.toLowerCase())) return;

				if (!consumableMap.has(m.itemId)) {
					consumableMap.set(m.itemId, {
						id: m.itemId,
						type: 'CONSUMABLE',
						matkomplek: '-',
						namaBarang: m.item.name,
						stok: 0,
						masuk: 0,
						keluar: 0,
						sisaBaik: 0,
						sisaRR: 0,
						sisaRB: 0,
						kondisi: 'BAIK',
						keterangan: m.notes || '-',
						tahun: new Date(m.createdAt).getFullYear(),
						equipmentType: null,
						baseUnit: m.item.baseUnit
					});
				}

				const entry = consumableMap.get(m.itemId);
				if (
					m.eventType === 'RECEIVE' ||
					m.eventType === 'TRANSFER_IN' ||
					m.eventType === 'DISTRIBUTE_IN'
				) {
					entry.masuk += Number(m.qty);
				} else if (
					m.eventType === 'ISSUE' ||
					m.eventType === 'TRANSFER_OUT' ||
					m.eventType === 'DISTRIBUTE_OUT'
				) {
					entry.keluar += Number(m.qty);
				}
				entry.stok = entry.masuk - entry.keluar;
				entry.sisaBaik = entry.stok;
			});

			results = [...results, ...Array.from(consumableMap.values())];
		}

		const filteredItems = results.filter(
			(item) => item.stok > 0 || item.masuk > 0 || item.keluar > 0
		);

		const totalItems = filteredItems.length;
		const totalPages = Math.ceil(totalItems / limit);
		const startIndex = (page - 1) * limit;
		const paginatedItems = filteredItems.slice(startIndex, startIndex + limit);

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
		console.error('API Komunity Error:', error);
		return json(
			{
				success: false,
				message: 'Internal Server Error'
			},
			{ status: 500 }
		);
	}
};
