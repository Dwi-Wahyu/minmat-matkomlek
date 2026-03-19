import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { itemUnitConversion } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

// Schema validasi input
const conversionSchema = z.object({
	itemId: z.string().uuid(),
	fromUnit: z.string().min(1).max(20),
	toUnit: z.string().min(1).max(20),
	multiplier: z.number().int().positive()
});

export const load: PageServerLoad = async () => {
	const conversions = await db.query.itemUnitConversion.findMany({
		with: {
			item: true
		},
		orderBy: (conv, { asc }) => [asc(conv.itemId)]
	});

	const items = await db.query.item.findMany({
		columns: { id: true, name: true },
		orderBy: (item, { asc }) => [asc(item.name)]
	});

	return { conversions, items };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const data = {
			itemId: formData.get('itemId')?.toString(),
			fromUnit: formData.get('fromUnit')?.toString(),
			toUnit: formData.get('toUnit')?.toString(),
			multiplier: parseInt(formData.get('multiplier')?.toString() || '0')
		};

		try {
			const validated = conversionSchema.parse(data);

			// Cek duplikat (itemId, fromUnit, toUnit)
			const existing = await db.query.itemUnitConversion.findFirst({
				where: and(
					eq(itemUnitConversion.itemId, validated.itemId),
					eq(itemUnitConversion.fromUnit, validated.fromUnit),
					eq(itemUnitConversion.toUnit, validated.toUnit)
				)
			});

			if (existing) {
				return fail(400, { message: 'Konversi sudah ada untuk item dan unit ini' });
			}

			await db.insert(itemUnitConversion).values({
				id: uuidv4(),
				...validated
			});
		} catch (err) {
			if (err instanceof z.ZodError) {
				return fail(400, { errors: err.errors });
			}
			return fail(500, { message: 'Kesalahan server internal' });
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
			multiplier: parseInt(formData.get('multiplier')?.toString() || '0')
		};

		try {
			const validated = conversionSchema.parse(data);

			// Cek duplikat kecuali dirinya sendiri
			const existing = await db.query.itemUnitConversion.findFirst({
				where: and(
					eq(itemUnitConversion.itemId, validated.itemId),
					eq(itemUnitConversion.fromUnit, validated.fromUnit),
					eq(itemUnitConversion.toUnit, validated.toUnit)
				)
			});

			if (existing && existing.id !== id) {
				return fail(400, { message: 'Konversi sudah ada untuk item dan unit ini' });
			}

			await db.update(itemUnitConversion).set(validated).where(eq(itemUnitConversion.id, id));
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
