import { db } from '$lib/server/db';
import { equipment, item, warehouse, organization, movement } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const detail = await db.query.equipment.findFirst({
		where: eq(equipment.id, id),
		with: {
			item: true,
			warehouse: {
				with: {
					organization: true
				}
			}
		}
	});

	if (!detail) throw error(404, 'Alat tidak ditemukan');

	// Ambil riwayat pergerakan terakhir
	const history = await db.query.movement.findMany({
		where: eq(movement.equipmentId, id),
		limit: 5,
		orderBy: [desc(movement.createdAt)],
		with: {
			organization: true,
			fromWarehouse: true,
			toWarehouse: true
		}
	});

	return {
		equipment: detail,
		history
	};
};
