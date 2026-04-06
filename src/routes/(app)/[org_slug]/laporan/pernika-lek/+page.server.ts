import { db } from '$lib/server/db';
import { item, equipment } from '$lib/server/db/schema';
import { organization } from '$lib/server/db/auth.schema';
import { error } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	try {
		// 1. Ambil data dengan grouping berdasarkan Nama dan Merek
		const rawData = await db
			.select({
				orgName: organization.name,
				itemName: item.name, // Kunci grouping utama
				brand: equipment.brand,
				unit: item.baseUnit,
				total: sql<number>`cast(count(${equipment.id}) as unsigned)`,
				baik: sql<number>`cast(sum(case when ${equipment.condition} = 'BAIK' then 1 else 0 end) as unsigned)`,
				rr: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_RINGAN' then 1 else 0 end) as unsigned)`,
				rb: sql<number>`cast(sum(case when ${equipment.condition} = 'RUSAK_BERAT' then 1 else 0 end) as unsigned)`,
				ket: sql<string>`MAX(${item.description})`
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.innerJoin(organization, eq(equipment.organizationId, organization.id))
			.where(eq(item.equipmentType, 'PERNIKA_LEK'))
			// FIX: Grouping hanya berdasarkan Nama, Brand, dan Satuan (bukan ID)
			.groupBy(organization.id, item.name, equipment.brand, item.baseUnit)
			.orderBy(organization.name, item.name);

		// 2. Transformasi data untuk Rowspan dan Penomoran Global
		let globalCounter = 0;
		const groupedByOrg = rawData.reduce(
			(acc, curr) => {
				let existingOrg = acc.find((o) => o.orgName === curr.orgName);

				if (existingOrg) {
					existingOrg.items.push({
						...curr,
						index: ++globalCounter // Nomor urut baris
					});
				} else {
					acc.push({
						orgName: curr.orgName,
						items: [
							{
								...curr,
								index: ++globalCounter
							}
						]
					});
				}
				return acc;
			},
			[] as { orgName: string; items: ((typeof rawData)[0] & { index: number })[] }[]
		);

		return {
			groupedReports: groupedByOrg
		};
	} catch (err) {
		console.error('Report Error:', err);
		throw error(500, 'Gagal memproses data laporan');
	}
};
