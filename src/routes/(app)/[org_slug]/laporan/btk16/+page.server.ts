import { db } from '$lib/server/db';
import { item, equipment, movement } from '$lib/server/db/schema';
import { eq, and, sql, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user || !locals.user.organization) {
		return {
			reportData: [],
			filters: { tahun: '2026', triwulan: 'Triwulan I' }
		};
	}

	const organizationId = locals.user.organization.id;
	const tahun = url.searchParams.get('tahun') || '2026';
	const triwulan = url.searchParams.get('triwulan') || 'Triwulan I';

	// Mapping Triwulan ke rentang bulan
	const triwulanMap: Record<string, { start: string; end: string }> = {
		'Triwulan I': { start: `${tahun}-01-01`, end: `${tahun}-03-31` },
		'Triwulan II': { start: `${tahun}-04-01`, end: `${tahun}-06-30` },
		'Triwulan III': { start: `${tahun}-07-01`, end: `${tahun}-09-30` },
		'Triwulan IV': { start: `${tahun}-10-01`, end: `${tahun}-12-31` }
	};

	const period = triwulanMap[triwulan] || triwulanMap['Triwulan I'];

	// Query data material dan status kondisinya saat ini
	// Untuk demo ini, kita ambil status saat ini dan asumsikan data historis (Tambah/Kurang)
	// Idealnya ini dihitung dari movement log berdasarkan rentang waktu
	const reportData = await db
		.select({
			id: item.id,
			jenisMaterial: item.name,
			kodeKatalog: sql<string>`"1201-" || substr(${item.id}, 1, 3)`,
			merekType: item.description,
			satuan: item.baseUnit,
			tahunPerolehan: sql<string>`"2023"`, // Placeholder
			topDspp: sql<number>`0`, // Placeholder
			// TW LALU (Saldo Awal)
			twLaluBaik: sql<number>`0`,
			twLaluRusakRingan: sql<number>`0`,
			twLaluRusakBerat: sql<number>`0`,
			twLaluJumlah: sql<number>`0`,
			// TAMBAH (Incoming)
			tambahBaik: sql<number>`count(case when ${movement.eventType} = 'RECEIVE' and ${equipment.condition} = 'BAIK' then 1 end)`,
			tambahRusakRingan: sql<number>`count(case when ${movement.eventType} = 'RECEIVE' and ${equipment.condition} = 'RUSAK_RINGAN' then 1 end)`,
			// KURANG (Outgoing)
			kurangBaik: sql<number>`count(case when ${movement.eventType} = 'ISSUE' and ${equipment.condition} = 'BAIK' then 1 end)`,
			kurangRusakRingan: sql<number>`count(case when ${movement.eventType} = 'ISSUE' and ${equipment.condition} = 'RUSAK_RINGAN' then 1 end)`,
			kurangRusakBerat: sql<number>`count(case when ${movement.eventType} = 'ISSUE' and ${equipment.condition} = 'RUSAK_BERAT' then 1 end)`,
			kurangJumlah: sql<number>`count(case when ${movement.eventType} = 'ISSUE' then 1 end)`,
			// SEKARANG (Saldo Akhir)
			sekarangBaik: sql<number>`count(case when ${equipment.condition} = 'BAIK' then 1 end)`,
			sekarangRusakRingan: sql<number>`count(case when ${equipment.condition} = 'RUSAK_RINGAN' then 1 end)`,
			sekarangRusakBerat: sql<number>`count(case when ${equipment.condition} = 'RUSAK_BERAT' then 1 end)`,
			sekarangJumlah: sql<number>`count(${equipment.id})`,
			keterangan: sql<string>`"-"`
		})
		.from(item)
		.leftJoin(equipment, and(eq(item.id, equipment.itemId), eq(equipment.organizationId, organizationId)))
		.leftJoin(movement, and(eq(equipment.id, movement.equipmentId), sql`${movement.createdAt} between ${period.start} and ${period.end}`))
		.groupBy(item.id, item.name, item.description, item.baseUnit);

	// Tambahkan perhitungan jumlah total di server side atau derivatif di client
	const enrichedData = reportData.map((row) => ({
		...row,
		twLaluJumlah: row.twLaluBaik + row.twLaluRusakRingan + row.twLaluRusakBerat,
		jumlahBaik: row.twLaluBaik + row.tambahBaik,
		jumlahRusakRingan: row.twLaluRusakRingan + row.tambahRusakRingan,
		jumlahRusakBerat: row.twLaluRusakBerat,
		jumlahTotal: row.twLaluBaik + row.tambahBaik + row.twLaluRusakRingan + row.tambahRusakRingan + row.twLaluRusakBerat
	}));

	return {
		reportData: enrichedData,
		filters: { tahun, triwulan }
	};
};
