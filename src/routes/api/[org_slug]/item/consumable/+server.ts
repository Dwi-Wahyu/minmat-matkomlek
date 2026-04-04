import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, like, sql } from 'drizzle-orm';

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
		// 1. Ambil list item consumable
		const items = await db
			.select()
			.from(item)
			.where(and(
				eq(item.type, 'CONSUMABLE'),
				nameFilter ? like(item.name, `%${nameFilter}%`) : undefined
			))
			.limit(limit)
			.offset(offset);

		if (items.length === 0) {
			return json({ success: true, data: [], pagination: { page, limit } });
		}

		const itemIds = items.map(i => i.id);

		// 2. Ambil stok untuk item-item tersebut di organisasi ini
		const stocksResults = await db
			.select({
				itemId: stock.itemId,
				qty: stock.qty,
				warehouseName: warehouse.name
			})
			.from(stock)
			.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
			.where(and(
				sql`${stock.itemId} IN ${itemIds}`,
				eq(warehouse.organizationId, organizationId)
			));

		// 3. Gabungkan data
		const finalData = items.map((i) => {
			const itemStocks = stocksResults.filter(s => s.itemId === i.id);
			const totalQty = itemStocks.reduce((acc, curr) => acc + Number(curr.qty), 0);
			const lokasi = itemStocks.map(s => s.warehouseName).filter(Boolean).join(', ');

			return {
				id: i.id,
				nama: i.name,
				satuan: i.baseUnit,
				deskripsi: i.description,
				image: i.imagePath ? `/uploads/item/${i.imagePath}` : null,
				totalStok: totalQty,
				lokasi: lokasi || '-'
			};
		});

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
