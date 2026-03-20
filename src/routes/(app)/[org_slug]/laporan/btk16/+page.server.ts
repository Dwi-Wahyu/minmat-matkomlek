import { db } from '$lib/server/db';
import { equipment, item } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Ambil parameter filter dari URL (Tahun, Triwulan)
	const tahun = url.searchParams.get('tahun') || '2026';
	const triwulan = url.searchParams.get('triwulan') || 'Triwulan I';

	// Query untuk mendapatkan ringkasan stok per item berdasarkan kondisi
	const reportData = await db
		.select({
			id: item.id,
			namaMaterial: item.name,
			kodeKatalog: sql<string>`"1201-" || substr(${item.id}, 1, 3)`, // Contoh format kode
			merekType: sql<string>`"Seksi Radio"`, // Placeholder sesuai gambar
			satuan: item.baseUnit,
			baik: sql<number>`count(case when ${equipment.condition} = 'BAIK' then 1 end)`,
			rusakRingan: sql<number>`count(case when ${equipment.condition} = 'RUSAK_RINGAN' then 1 end)`,
			rusakBerat: sql<number>`count(case when ${equipment.condition} = 'RUSAK_BERAT' then 1 end)`
		})
		.from(item)
		.leftJoin(equipment, eq(item.id, equipment.itemId))
		.groupBy(item.id, item.name, item.baseUnit);

	return {
		reportData,
		filters: { tahun, triwulan }
	};
};
