import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { equipment, item } from '$lib/server/db/schema';
import { eq, and, like, exists } from 'drizzle-orm';

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
		const results = await db.query.equipment.findMany({
			where: (equip, { and, eq }) => {
				const filters = [eq(equip.organizationId, organizationId)];

				if (conditionFilter) {
					filters.push(eq(equip.condition, conditionFilter as any));
				}

				if (nameFilter) {
					filters.push(
						exists(
							db.select()
								.from(item)
								.where(and(eq(item.id, equip.itemId), like(item.name, `%${nameFilter}%`)))
						)
					);
				}

				return and(...filters);
			},
			with: {
				item: true, // Untuk mendapatkan nama barang
				warehouse: {
					columns: { name: true }
				}
			},
			limit: limit,
			offset: offset
		});

		const finalData = results.map((e) => ({
			id: e.id,
			nama: e.item.name,
			sn: e.serialNumber,
			brand: e.brand,
			kondisi: e.condition,
			status: e.status,
			gudang: e.warehouse?.name,
			tipe: e.item.equipmentType
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
