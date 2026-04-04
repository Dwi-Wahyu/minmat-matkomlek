import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item, warehouse } from '$lib/server/db/schema';
import { eq, and, like } from 'drizzle-orm';

export const GET = async ({ url, locals }) => {
	// Validasi Organisasi
	if (!locals.user?.organization) {
		return json({ success: false, message: 'Unauthorized' }, { status: 401 });
	}
	const { id: organizationId } = locals.user.organization;

	// Ambil Query Params
	const nameFilter = url.searchParams.get('name');
	const conditionFilter = url.searchParams.get('condition'); // BAIK, RUSAK_RINGAN, RUSAK_BERAT
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = parseInt(url.searchParams.get('limit') || '10');
	const offset = (page - 1) * limit;

	try {
		// Menggunakan select eksplisit untuk menghindari LEFT JOIN LATERAL
		const query = db
			.select({
				equipment: equipment,
				item: item,
				warehouseName: warehouse.name
			})
			.from(equipment)
			.innerJoin(item, eq(equipment.itemId, item.id))
			.leftJoin(warehouse, eq(equipment.warehouseId, warehouse.id))
			.where(
				and(
					eq(equipment.organizationId, organizationId),
					conditionFilter ? eq(equipment.condition, conditionFilter as any) : undefined,
					nameFilter ? like(item.name, `%${nameFilter}%`) : undefined
				)
			)
			.limit(limit)
			.offset(offset);

		const results = await query;

		const finalData = results.map((r) => ({
			id: r.equipment.id,
			nama: r.item.name,
			sn: r.equipment.serialNumber,
			brand: r.equipment.brand,
			kondisi: r.equipment.condition,
			status: r.equipment.status,
			gudang: r.warehouseName,
			tipe: r.item.equipmentType,
			image: r.equipment.imagePath ? `/uploads/equipment/${r.equipment.imagePath}` : null
		}));

		return json({
			success: true,
			data: finalData,
			pagination: {
				page,
				limit
			}
		});
	} catch (error) {
		console.error('Asset API Error:', error);
		return json({ success: false, message: 'Internal Server Error' }, { status: 500 });
	}
};
