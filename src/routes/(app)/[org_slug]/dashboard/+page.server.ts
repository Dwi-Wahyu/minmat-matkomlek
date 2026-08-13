import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	equipment,
	stock,
	movement,
	warehouse,
	item,
	organization,
	user,
	lending,
	member,
	maintenance,
	distribution
} from '$lib/server/db/schema';
import { eq, and, count, sum, gte, desc, sql, inArray, ne, or } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getOrSetCache, CacheTTL } from '$lib/server/redis';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	// Ambil ID organisasi berdasarkan slug dari URL - Menggunakan select eksplisit untuk keamanan
	const orgResult = await db
		.select()
		.from(organization)
		.where(eq(organization.slug, params.org_slug))
		.limit(1);

	if (orgResult.length === 0) {
		throw error(404, 'Organization not found');
	}

	const org = orgResult[0];
	const orgId = org.id;

	const isSatuanBawahan = locals.user?.organization?.parentId !== null;
	const REMINDER_ROLES = ['kepalaGudang', 'operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'];
	const roleAllowed = locals.user?.role ? REMINDER_ROLES.includes(locals.user.role) : false;
	const isCentralKomunityKG = !isSatuanBawahan && locals.user?.role === 'kepalaGudang' && locals.user?.warehouseHeadType === 'KOMUNITY';

	let returnReminders: {
		lendingId: string;
		unit: string;
		equipmentName: string;
		serialNumber: string;
		endDate: Date;
		isOverdue: boolean;
	}[] = [];

	if ((isSatuanBawahan && roleAllowed) || isCentralKomunityKG) {
		let memberIds: string[] = [];
		if (isSatuanBawahan) {
			const members = await db.query.member.findMany({
				where: eq(member.organizationId, orgId),
				columns: { userId: true }
			});
			memberIds = members.map((m) => m.userId!).filter(Boolean);
		}

		if (isCentralKomunityKG || memberIds.length > 0) {
			const now = new Date();
			const REMINDER_DUE_SOON_DAYS = 1; // H-1
			const soonThreshold = new Date(now.getTime() + REMINDER_DUE_SOON_DAYS * 24 * 60 * 60 * 1000);

			const lendingFilter = isCentralKomunityKG
				? and(eq(lending.organizationId, orgId), eq(lending.status, 'DIPINJAM'))
				: and(inArray(lending.requestedBy, memberIds), eq(lending.status, 'DIPINJAM'));

			const dueLendings = await db.query.lending.findMany({
				where: lendingFilter,
				columns: { id: true, unit: true, endDate: true },
				with: {
					items: {
						with: {
							equipment: {
								with: {
									item: { columns: { name: true } }
								}
							}
						}
					}
				}
			});

			const flatItems: typeof returnReminders = [];

			for (const l of dueLendings) {
				if (!l.endDate) continue;
				if (new Date(l.endDate) > soonThreshold) continue;

				for (const li of l.items) {
					flatItems.push({
						lendingId: l.id,
						unit: l.unit,
						equipmentName: li.equipment?.item?.name ?? 'Alat tidak dikenal',
						serialNumber: li.equipment?.serialNumber ?? '-',
						endDate: l.endDate as Date,
						isOverdue: new Date(l.endDate as Date) < now
					});
				}
			}

			returnReminders = flatItems.sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
		}
	}

	const OPERATOR_ROLES = ['operatorPusatDanDaerah', 'operatorBinmatDanBekharrah'];
	const isOperator = locals.user?.role && OPERATOR_ROLES.includes(locals.user.role);

	// Dashboard khusus operator — tidak di-cache per org, tapi per user
	if (isOperator) {
		// Ambil mutasi TRANSFER_OUT yang perlu diproses oleh org ini
		const pendingTransferIn = await db
			.select({
				movement: movement,
				equipment: equipment,
				item: item,
				pic: user
			})
			.from(movement)
			.innerJoin(equipment, eq(movement.equipmentId, equipment.id))
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(user, eq(movement.picId, user.id))
			.where(
				and(
					eq(movement.eventType, 'TRANSFER_OUT'),
					eq(movement.organizationId, orgId),
					eq(equipment.status, 'TRANSIT'),
					ne(movement.picId, locals.user!.id)
				)
			)
			.limit(10)
			.orderBy(desc(movement.createdAt));

		// Hitung jumlah alat TRANSIT di org ini (perlu konfirmasi)
		const [transitCount] = await db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), eq(equipment.status, 'TRANSIT')));

		// Hitung mutasi bulan ini yang dibuat oleh org ini
		const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const [myMovementsCount] = await db
			.select({ count: count() })
			.from(movement)
			.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startOfMonth)));

		// Hitung alat kondisi tidak baik
		const [damagedCount] = await db
			.select({ count: count() })
			.from(equipment)
			.where(and(eq(equipment.organizationId, orgId), ne(equipment.condition, 'BAIK')));

		// Cek apakah org ini adalah org induk (Puskomlekad = tidak punya parentId)
		const orgData = await db.query.organization.findFirst({
			where: eq(organization.id, orgId),
			columns: { parentId: true }
		});
		const isPuskomlekad = !orgData?.parentId;
		let pendingLendingActions: {
			lendingId: string;
			unit: string;
			status: string;
			actionLabel: string;
			createdAt: Date;
		}[] = [];

		if (isPuskomlekad) {
			// Operator Puskomlekad perlu aksi pada status APPROVED/PERINTAH_LANGSUNG dan DIKIRIM_KEMBALI
			const pending = await db.query.lending.findMany({
				where: and(
					eq(lending.organizationId, orgId),
					inArray(lending.status, ['APPROVED', 'PERINTAH_LANGSUNG', 'DIKIRIM_KEMBALI'])
				),
				columns: { id: true, unit: true, status: true, createdAt: true },
				limit: 10,
				orderBy: (l, { desc }) => [desc(l.createdAt)]
			});

			pendingLendingActions = pending.map((l) => ({
				lendingId: l.id,
				unit: l.unit,
				status: l.status!,
				actionLabel:
					l.status === 'DIKIRIM_KEMBALI'
						? 'Konfirmasi penerimaan kembali'
						: 'Keluarkan alat dari gudang',
				createdAt: l.createdAt
			}));
		} else {
			// Operator satuan jajaran perlu aksi pada status DALAM_PENGIRIMAN dan DIPINJAM
			// Cari lending yang ditujukan ke org INDUK tapi requestedBy dari org ini
			const members = await db.query.member.findMany({
				where: eq(member.organizationId, orgId),
				columns: { userId: true }
			});
			const memberIds = members.map((m) => m.userId!).filter(Boolean);

			if (memberIds.length > 0) {
				const pending = await db.query.lending.findMany({
					where: and(
						inArray(lending.requestedBy, memberIds),
						inArray(lending.status, ['DALAM_PENGIRIMAN', 'DIPINJAM'])
					),
					columns: { id: true, unit: true, status: true, createdAt: true },
					limit: 10,
					orderBy: (l, { desc }) => [desc(l.createdAt)]
				});

				pendingLendingActions = pending.map((l) => ({
					lendingId: l.id,
					unit: l.unit,
					status: l.status!,
					actionLabel:
						l.status === 'DALAM_PENGIRIMAN'
							? 'Konfirmasi penerimaan alat'
							: 'Kirim kembali ke gudang',
					createdAt: l.createdAt
				}));
			}
		}

		return {
			org_slug: params.org_slug,
			isOperator: true,
			operatorDashboard: {
				pendingTransferIn: pendingTransferIn.map((r) => ({
					movementId: r.movement.id,
					equipmentId: r.equipment.id,
					equipmentType: r.item.equipmentType,
					itemName: r.item.name,
					serialNumber: r.equipment.serialNumber,
					fromWarehouseName: '-', // warehouse info could be added if needed via more joins
					picName: r.pic?.name ?? '-',
					createdAt: r.movement.createdAt
				})),
				transitCount: Number(transitCount?.count) || 0,
				myMovementsThisMonth: Number(myMovementsCount?.count) || 0,
				damagedCount: Number(damagedCount?.count) || 0,
				pendingLendingActions
			},
			returnReminders,
			isSatuanBawahan
		};
	}

	// Dashboard khusus Kepala Gudang — terfilter sesuai warehouseHeadType (TRANSITO/BALKIR/KOMUNITY)
	// Tidak ikut cache "dashboard:{orgId}:*" milik DashboardPimpinan karena scope datanya beda (per warehouseHeadType, bukan per filter periode)
	const isKepalaGudang = locals.user?.role === 'kepalaGudang';

	if (isKepalaGudang) {
		const warehouseHeadType = locals.user?.warehouseHeadType;

		// Kepala Gudang satuan jajaran (non-pusat) tidak memiliki warehouseHeadType spesifik —
		// dia mengelola satu gudang tunggal yang menangani SEMUA jenis pergerakan (Balkir, Transito, Komunity)
		// sekaligus, berbeda dengan Kepala Gudang Pusat yang masing-masing dibagi per klasifikasi.
		// Maka headType 'ALL' di sini BUKAN fallback/default tampilan, tapi mode tampilan gabungan yang
		// sengaja menampilkan ketiga panel sekaligus.
		const headType: 'TRANSITO' | 'BALKIR' | 'KOMUNITY' | 'ALL' = warehouseHeadType ?? 'ALL';

		const kgCacheKey = `dashboard:kepalaGudang:${orgId}:${locals.user!.id}:${headType}`;

		const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

		const kgDashboardPromise = getOrSetCache(
			kgCacheKey,
			async () => {
				// Status equipment yang relevan dengan jenis gudang yang diawasi.
				// Untuk mode 'ALL' (kepala gudang satuan jajaran), relevantStatuses mencakup ketiganya
				// sehingga summary atas menghitung gabungan, bukan satu status saja.
				// const statusByHeadType: Record<string, ('READY' | 'TRANSIT' | 'IN_USE')[]> = {
				// 	BALKIR: ['READY'],
				// 	TRANSITO: ['TRANSIT'],
				// 	KOMUNITY: ['IN_USE'],
				// 	ALL: ['READY', 'TRANSIT', 'IN_USE']
				// };
				// const relevantStatuses = statusByHeadType[headType];

				const relevantClassifications: ('BALKIR' | 'TRANSITO' | 'KOMUNITY')[] =
					headType === 'ALL' ? ['BALKIR', 'TRANSITO', 'KOMUNITY'] : [headType];

				const [totalAlat] = await db
					.select({ count: count() })
					.from(equipment)
					.where(
						and(
							eq(equipment.organizationId, orgId),
							inArray(equipment.classification, relevantClassifications)
						)
					);

				const [siapPakai] = await db
					.select({ count: count() })
					.from(equipment)
					.where(
						and(
							eq(equipment.organizationId, orgId),
							inArray(equipment.classification, relevantClassifications),
							eq(equipment.condition, 'BAIK')
						)
					);

				const [rusak] = await db
					.select({ count: count() })
					.from(equipment)
					.where(
						and(
							eq(equipment.organizationId, orgId),
							inArray(equipment.classification, relevantClassifications),
							sql`${equipment.condition} != 'BAIK'`
						)
					);

				// Mutasi bulan ini — mode ALL menghitung ketiga klasifikasi (tanpa filter classification),
				// mode spesifik tetap hanya menghitung classification miliknya sendiri
				const [mutasiBulanIni] = await db
					.select({ count: count() })
					.from(movement)
					.where(
						and(
							eq(movement.organizationId, orgId),
							headType === 'ALL'
								? inArray(movement.classification, ['BALKIR', 'TRANSITO', 'KOMUNITY'])
								: eq(movement.classification, headType),
							gte(movement.createdAt, startOfMonth)
						)
					);

				// Panel spesifik per jenis gudang — untuk mode ALL, ketiganya dihitung sekaligus
				let transito, balkir, komunity;

				if (headType === 'TRANSITO' || headType === 'ALL') {
					const [transitoTotal] = await db
						.select({ count: count() })
						.from(equipment)
						.where(
							and(
								eq(equipment.organizationId, orgId),
								or(eq(equipment.classification, 'TRANSITO'), eq(equipment.status, 'TRANSIT'))
							)
						);

					transito = {
						total: Number(transitoTotal?.count) || 0
					};
				}

				if (headType === 'BALKIR' || headType === 'ALL') {
					const [balkirTotal] = await db
						.select({ count: count() })
						.from(equipment)
						.where(
							and(
								eq(equipment.organizationId, orgId),
								eq(equipment.classification, 'BALKIR')
							)
						);

					balkir = {
						total: Number(balkirTotal?.count) || 0
					};
				}

				if (headType === 'KOMUNITY' || headType === 'ALL') {
					const [komunityTotal] = await db
						.select({ count: count() })
						.from(equipment)
						.where(
							and(
								eq(equipment.organizationId, orgId),
								or(eq(equipment.classification, 'KOMUNITY'), eq(equipment.status, 'IN_USE'))
							)
						);

					komunity = {
						total: Number(komunityTotal?.count) || 0
					};
				}

				// Daftar pemeliharaan yang masih pending/berjalan — hanya untuk alat dengan status
				// yang relevan dengan jenis gudang yang diawasi (mode ALL mencakup ketiga status)
				const pemeliharaanResults = await db
					.select({ maintenance: maintenance, equipment: equipment, item: item })
					.from(maintenance)
					.innerJoin(equipment, eq(maintenance.equipmentId, equipment.id))
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							inArray(equipment.classification, relevantClassifications),
							inArray(maintenance.status, ['PENDING', 'IN_PROGRESS'])
						)
					)
					.limit(6)
					.orderBy(desc(maintenance.scheduledDate));

				// Daftar alat dengan kondisi tidak baik pada status yang relevan dengan gudang ini
				const alatPerluPerhatianResults = await db
					.select({ equipment: equipment, item: item })
					.from(equipment)
					.innerJoin(item, eq(equipment.itemId, item.id))
					.where(
						and(
							eq(equipment.organizationId, orgId),
							inArray(equipment.classification, relevantClassifications),
							sql`${equipment.condition} != 'BAIK'`
						)
					)
					.limit(8)
					.orderBy(desc(equipment.updatedAt));

				return {
					org_slug: params.org_slug,
					warehouseHeadType: headType,
					summary: {
						totalAlat: Number(totalAlat?.count) || 0,
						siapPakai: Number(siapPakai?.count) || 0,
						rusak: Number(rusak?.count) || 0,
						mutasiBulanIni: Number(mutasiBulanIni?.count) || 0
					},
					transito,
					balkir,
					komunity,
					pemeliharaanPending: pemeliharaanResults.map((r) => ({
						id: r.maintenance.id,
						equipmentName: r.item.name,
						serialNumber: r.equipment.serialNumber,
						maintenanceType: r.maintenance.maintenanceType,
						status: r.maintenance.status ?? 'PENDING',
						scheduledDate: r.maintenance.scheduledDate.toISOString()
					})),
					alatPerluPerhatian: alatPerluPerhatianResults.map((r) => ({
						id: r.equipment.id,
						name: r.item.name,
						brand: r.equipment.brand,
						serialNumber: r.equipment.serialNumber,
						condition: r.equipment.condition,
						status: r.equipment.status
					}))
				};
			},
			CacheTTL.DASHBOARD
		);

		return {
			org_slug: params.org_slug,
			isKepalaGudang: true,
			kgDashboardPromise,
			returnReminders,
			isSatuanBawahan
		};
	}

	// Baca filter dari URL search params
	const period = url.searchParams.get('period') || 'this_month';
	const equipmentType = url.searchParams.get('type') || 'ALL'; // 'ALL' | 'ALKOMLEK' | 'PERNIKA_LEK'

	const cacheKey = `dashboard:${orgId}:${period}:${equipmentType}`;

	const dashboardDataPromise = getOrSetCache(
		cacheKey,
		async () => {
			// Hitung date range berdasarkan period
			const now = new Date();
			let startDate: Date;

			switch (period) {
				case '3_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
					break;
				case '6_months':
					startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
					break;
				case 'this_year':
					startDate = new Date(now.getFullYear(), 0, 1);
					break;
				case 'this_month':
				default:
					startDate = new Date(now.getFullYear(), now.getMonth(), 1);
					break;
			}

			// Filter tipe alat — null berarti tidak difilter (ALL)
			const equipmentTypeFilter =
				equipmentType !== 'ALL'
					? eq(item.equipmentType, equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
					: undefined;

			// Ringkasan Stats (Top Cards)
			const [activeInventoryCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(and(and(eq(equipment.organizationId, orgId), equipmentTypeFilter)));

			const [warehouseStockSum] = await db
				.select({ total: sum(stock.qty) })
				.from(stock)
				.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
				.where(eq(warehouse.organizationId, orgId));

			const [damagedItemsCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						and(
							eq(equipment.organizationId, orgId),
							sql`${equipment.condition} != 'BAIK'`,
							equipmentTypeFilter
						)
					)
				);

			const [monthlyMovementsCount] = await db
				.select({ count: count() })
				.from(movement)
				.where(and(eq(movement.organizationId, orgId), gte(movement.createdAt, startDate)));

			// Transito Stats
			const [transitoCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						or(eq(equipment.classification, 'TRANSITO'), eq(equipment.status, 'TRANSIT')),
						equipmentTypeFilter
					)
				);

			// Komoditi Stats
			const [komoditiCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						or(eq(equipment.classification, 'KOMUNITY'), eq(equipment.status, 'IN_USE')),
						equipmentTypeFilter
					)
				);

			// Balkir Stats
			const [balkirCount] = await db
				.select({ count: count() })
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(
					and(
						eq(equipment.organizationId, orgId),
						eq(equipment.classification, 'BALKIR'),
						equipmentTypeFilter
					)
				);

			// Daftar Alat Terbaru - Menggunakan join eksplisit untuk menghindari LEFT JOIN LATERAL
			const recentEquipmentsResults = await db
				.select({
					equipment: equipment,
					item: item
				})
				.from(equipment)
				.innerJoin(item, eq(equipment.itemId, item.id))
				.where(and(and(eq(equipment.organizationId, orgId), equipmentTypeFilter)))
				.limit(5)
				.orderBy(desc(equipment.createdAt));

			return {
				org_slug: params.org_slug,
				activeFilters: {
					period,
					equipmentType
				},
				summary: {
					activeInventory: Number(activeInventoryCount?.count) || 0,
					warehouseStock: Number(warehouseStockSum?.total) || 0,
					damagedItems: Number(damagedItemsCount?.count) || 0,
					monthlyMovements: Number(monthlyMovementsCount?.count) || 0
				},
				transito: {
					total: Number(transitoCount?.count) || 0
				},
				komoditi: {
					total: Number(komoditiCount?.count) || 0
				},
				balkir: {
					total: Number(balkirCount?.count) || 0
				},
				recentEquipments: recentEquipmentsResults.map((r) => ({
					id: r.equipment.id,
					name: r.item.name,
					brand: r.equipment.brand,
					serialNumber: r.equipment.serialNumber,
					type: r.item.equipmentType,
					condition: r.equipment.condition,
					status: r.equipment.status
				}))
			};
		},
		CacheTTL.DASHBOARD
	);

	return {
		org_slug: params.org_slug,
		activeFilters: {
			period,
			equipmentType
		},
		dashboardDataPromise,
		returnReminders,
		isSatuanBawahan
	};
};
