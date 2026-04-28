import { db } from '$lib/server/db';
import { warehouse, item, movement, stock } from '$lib/server/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/login');

	const ids = url.searchParams.get('ids')?.split(',') || [];

	// Fetch available warehouses for the organization
	const [warehouses, selectedItems] = await Promise.all([
		db.query.warehouse.findMany({
			where: eq(warehouse.organizationId, user.organization.id)
		}),
		ids.length > 0
			? db.query.item.findMany({
					where: and(inArray(item.id, ids), eq(item.type, 'CONSUMABLE')),
					with: {
						stocks: {
							with: { warehouse: true }
						}
					}
				})
			: Promise.resolve([])
	]);

	return {
		warehouses,
		selectedItems
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const batchDataRaw = formData.get('batchData') as string;
		
		if (!batchDataRaw) {
			return fail(400, { message: 'Data mutasi tidak boleh kosong' });
		}

		const batchItems = JSON.parse(batchDataRaw);

		try {
			await db.transaction(async (tx) => {
				for (const bItem of batchItems) {
					const { itemId, eventType, qty, toWarehouseId, fromWarehouseId, notes } = bItem;

					const amount = Number(qty);
					if (isNaN(amount) || amount <= 0) continue;

					const targetWhId = toWarehouseId || null;
					const sourceWhId = fromWarehouseId || null;

					// 1. Update Stock Logic
					if (eventType === 'RECEIVE' && targetWhId) {
						// Increase stock at target warehouse
						const existingStock = await tx.query.stock.findFirst({
							where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, targetWhId))
						});

						if (existingStock) {
							await tx.update(stock)
								.set({ qty: (Number(existingStock.qty) + amount).toString() })
								.where(eq(stock.id, existingStock.id));
						} else {
							await tx.insert(stock).values({
								id: crypto.randomUUID(),
								itemId,
								warehouseId: targetWhId,
								qty: amount.toString()
							});
						}
					} else if (eventType === 'ISSUE' && sourceWhId) {
						// Decrease stock at source warehouse
						const existingStock = await tx.query.stock.findFirst({
							where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, sourceWhId))
						});

						if (existingStock) {
							const newQty = Math.max(0, Number(existingStock.qty) - amount);
							await tx.update(stock)
								.set({ qty: newQty.toString() })
								.where(eq(stock.id, existingStock.id));
						}
					} else if (eventType === 'ADJUSTMENT' && targetWhId) {
						// Set stock at target warehouse (Absolute adjustment)
						const existingStock = await tx.query.stock.findFirst({
							where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, targetWhId))
						});

						if (existingStock) {
							await tx.update(stock)
								.set({ qty: amount.toString() })
								.where(eq(stock.id, existingStock.id));
						} else {
							await tx.insert(stock).values({
								id: crypto.randomUUID(),
								itemId,
								warehouseId: targetWhId,
								qty: amount.toString()
							});
						}
					} else if (eventType === 'TRANSFER' && sourceWhId && targetWhId) {
						// Decrease from source
						const sourceStock = await tx.query.stock.findFirst({
							where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, sourceWhId))
						});
						if (sourceStock) {
							const newQty = Math.max(0, Number(sourceStock.qty) - amount);
							await tx.update(stock)
								.set({ qty: newQty.toString() })
								.where(eq(stock.id, sourceStock.id));
						}

						// Increase at target
						const targetStock = await tx.query.stock.findFirst({
							where: and(eq(stock.itemId, itemId), eq(stock.warehouseId, targetWhId))
						});
						if (targetStock) {
							await tx.update(stock)
								.set({ qty: (Number(targetStock.qty) + amount).toString() })
								.where(eq(stock.id, targetStock.id));
						} else {
							await tx.insert(stock).values({
								id: crypto.randomUUID(),
								itemId,
								warehouseId: targetWhId,
								qty: amount.toString()
							});
						}
					}

					// 2. Record Movement
					await tx.insert(movement).values({
						id: crypto.randomUUID(),
						itemId: itemId,
						organizationId: user.organization.id,
						eventType: eventType === 'TRANSFER' ? 'TRANSFER_IN' : eventType, // Normalize TRANSFER to eventTypeEnum
						qty: amount.toString(),
						fromWarehouseId: sourceWhId,
						toWarehouseId: targetWhId,
						notes: notes || `Mutasi batch barang: ${eventType}`,
						picId: user.id,
						createdAt: new Date()
					});
				}
			});

			return { success: true, message: `${batchItems.length} jenis barang berhasil dimutasi` };
		} catch (error) {
			console.error('Error in batch mutate barang:', error);
			return fail(500, { message: 'Gagal memproses mutasi batch barang' });
		}
	}
};
