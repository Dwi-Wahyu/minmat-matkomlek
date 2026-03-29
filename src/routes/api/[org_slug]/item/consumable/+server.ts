import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, like } from 'drizzle-orm';

export const GET = async ({ url, locals }) => {
	if (!locals.user?.organization) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}
	const { id: organizationId } = locals.user.organization;

	const nameFilter = url.searchParams.get('name');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const offset = (page - 1) * limit;

	try {
		// Mengambil item tipe consumable yang memiliki stok di organisasi user
		const items = await db.query.item.findMany({
			where: and(
				eq(item.type, 'CONSUMABLE'),
				nameFilter ? like(item.name, `%${nameFilter}%`) : undefined
			),
			with: {
				stocks: {
					with: {
						warehouse: true
					}
				}
			},
			limit: limit,
			offset: offset
		});

		// Transformasi data untuk menampilkan total stok di organisasi tersebut
		const finalData = items
			.map((i) => {
				const orgStocks = i.stocks.filter((s) => s.warehouse?.organizationId === organizationId);
				const totalQty = orgStocks.reduce((acc, curr) => acc + curr.qty, 0);

				return {
					id: i.id,
					nama: i.name,
					satuan: i.baseUnit,
					deskripsi: i.description,
					totalStok: totalQty,
					lokasi: orgStocks.map((s) => s.warehouse?.name).filter(Boolean).join(', ')
				};
			})
			.filter((i) => i.totalStok >= 0); // Tampilkan semua yang terdaftar di org

		return json({ 
			success: true, 
			data: finalData,
			pagination: {
				page,
				limit
			}
		});
	} catch (error) {
		console.error('Consumable API Error:', error);
		return json({ success: false, message: 'Internal Server Error' }, { status: 500 });
	}
};
