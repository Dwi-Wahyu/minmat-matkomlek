import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { item as itemTable, itemUnitConversion, stock, warehouse } from '$lib/server/db/schema';
import { eq, and, exists } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

// Schema validasi input
const conversionSchema = z.object({
	itemId: z.string().uuid(),
	fromUnit: z.string().min(1).max(20),
	toUnit: z.string().min(1).max(20),
	multiplier: z.number().positive()
});

export const load: PageServerLoad = async ({ locals }) => {
	const organizationId = locals.user.organization.id;

	// Ambil konversi yang itemnya ada di stok organisasi ini
	const conversions = await db.query.itemUnitConversion.findMany({
		where: (table, { exists, and, eq }) => 
			exists(
				db
					.select()
					.from(stock)
					.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
					.where(
						and(
							eq(stock.itemId, table.itemId),
							eq(warehouse.organizationId, organizationId)
						)
					)
			),
		with: {
			item: true
		},
		orderBy: (conv, { asc }) => [asc(conv.itemId)]
	});

	// Ambil hanya item CONSUMABLE yang ada di stok organisasi ini
	const items = await db
		.select({
			id: itemTable.id,
			name: itemTable.name,
			baseUnit: itemTable.baseUnit
		})
		.from(itemTable)
		.where(
			and(
				eq(itemTable.type, 'CONSUMABLE'),
				exists(
					db
						.select()
						.from(stock)
						.innerJoin(warehouse, eq(stock.warehouseId, warehouse.id))
						.where(
							and(eq(stock.itemId, itemTable.id), eq(warehouse.organizationId, organizationId))
						)
				)
			)
		)
		.orderBy(itemTable.name);

	return { conversions, items };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const itemIdsRaw = formData.get('itemIds')?.toString();
		const itemIds: string[] = JSON.parse(itemIdsRaw || '[]');

		const fromUnit = formData.get('fromUnit')?.toString();
		const multiplier = parseFloat(formData.get('multiplier')?.toString() || '0');

		if (itemIds.length === 0 || !fromUnit || !multiplier) {
			return fail(400, { message: 'Data konversi tidak lengkap' });
		}

		try {
			await db.transaction(async (tx) => {
				for (const itemId of itemIds) {
					// Ambil baseUnit item ini secara independen
					const itemDetail = await tx.query.item.findFirst({
						where: eq(itemTable.id, itemId),
						columns: { baseUnit: true }
					});

					if (!itemDetail) continue;

					// Cek duplikat (itemId, fromUnit)
					const existing = await tx.query.itemUnitConversion.findFirst({
						where: and(
							eq(itemUnitConversion.itemId, itemId),
							eq(itemUnitConversion.fromUnit, fromUnit)
						)
					});

					if (existing) continue;

					await tx.insert(itemUnitConversion).values({
						id: uuidv4(),
						itemId,
						fromUnit,
						toUnit: itemDetail.baseUnit, // Menggunakan baseUnit spesifik item tersebut
						multiplier: multiplier.toString()
					});
				}
			});
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menyimpan konversi unit' });
		}

		return { success: true };
	},

	update: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		const data = {
			itemId: formData.get('itemId')?.toString(),
			fromUnit: formData.get('fromUnit')?.toString(),
			toUnit: formData.get('toUnit')?.toString(),
			multiplier: parseFloat(formData.get('multiplier')?.toString() || '0')
		};

		try {
			const validated = conversionSchema.parse(data);

			// Ambil item untuk memastikan toUnit sama dengan baseUnit
			const targetItem = await db.query.item.findFirst({
				where: eq(itemTable.id, validated.itemId)
			});

			if (!targetItem) {
				return fail(400, { message: 'Item tidak ditemukan' });
			}

			// Paksa toUnit menggunakan baseUnit dari item
			validated.toUnit = targetItem.baseUnit;

			// Cek duplikat kecuali dirinya sendiri
			const existing = await db.query.itemUnitConversion.findFirst({
				where: and(
					eq(itemUnitConversion.itemId, validated.itemId),
					eq(itemUnitConversion.fromUnit, validated.fromUnit)
				)
			});

			if (existing && existing.id !== id) {
				return fail(400, { message: 'Konversi sudah ada untuk item dan satuan asal ini' });
			}

			await db
				.update(itemUnitConversion)
				.set({
					...validated,
					multiplier: validated.multiplier.toString()
				})
				.where(eq(itemUnitConversion.id, id));
		} catch (err) {
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		if (!id) return fail(400, { message: 'ID tidak ditemukan' });

		try {
			await db.delete(itemUnitConversion).where(eq(itemUnitConversion.id, id));
		} catch (err) {
			return fail(500, { message: 'Kesalahan server internal' });
		}

		return { success: true };
	}
};
