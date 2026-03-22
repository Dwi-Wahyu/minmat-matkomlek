import { db } from '$lib/server/db';
import { movement } from '@/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export const load = async ({ params, locals }) => {
	const { id: organizationId } = locals.user.organization;

	const movements = await db.query.movement.findMany({
		where: and(
			eq(movement.classification, 'KOMUNITY'),
			eq(movement.organizationId, organizationId)
		),

		with: {
			equipment: {
				with: {
					item: true
				}
			},
			item: true
		},
		orderBy: [desc(movement.createdAt)]
	});

	return {
		movements: movements.map((m) => {
			// Jika movement untuk asset (punya equipment)
			if (m.equipment) {
				return {
					id: m.id,
					type: 'asset' as const,
					nama: m.equipment.item.name,
					kategori: m.item?.equipmentType,
					notes: m.notes,
					qty: m.qty
				};
			}
			// Jika movement untuk consumable (punya item)
			else if (m.item) {
				return {
					id: m.id,
					type: 'consumable' as const,
					nama: m.item.name,
					kategori: null, // consumable tidak punya equipment type
					notes: m.notes,
					qty: m.qty
				};
			}
			// Fallback jika keduanya null (seharusnya tidak terjadi)
			return {
				id: m.id,
				type: 'unknown' as const,
				nama: 'Unknown',
				kategori: null,
				qty: m.qty,
				notes: m.notes
			};
		})
	};
};
