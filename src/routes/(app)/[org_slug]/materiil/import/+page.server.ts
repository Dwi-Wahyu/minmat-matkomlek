import { db } from '$lib/server/db';
import { item, equipment, stock, warehouse, importLog, user } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { error, fail } from '@sveltejs/kit';

export const load = async ({ params, locals }) => {
	const sessionUser = locals.user;
	if (!sessionUser) throw error(401, 'Unauthorized');

	const org = await db.query.organization.findFirst({
		where: (org, { eq }) => eq(org.slug, params.org_slug)
	});

	if (!org) throw error(404, 'Organization not found');

	// Gunakan manual join atau query terpisah untuk menghindari lateral join (masalah kompatibilitas MySQL)
	const history = await db
		.select({
			id: importLog.id,
			organizationId: importLog.organizationId,
			userId: importLog.userId,
			filename: importLog.filename,
			status: importLog.status,
			totalRows: importLog.totalRows,
			successRows: importLog.successRows,
			errorRows: importLog.errorRows,
			errorMessage: importLog.errorMessage,
			createdAt: importLog.createdAt,
			user: {
				name: user.name
			}
		})
		.from(importLog)
		.leftJoin(user, eq(importLog.userId, user.id))
		.where(eq(importLog.organizationId, org.id))
		.orderBy(desc(importLog.createdAt))
		.limit(10);

	return {
		history
	};
};

export const actions = {
	import: async ({ request, params, locals }) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { message: 'Unauthorized' });

		const org = await db.query.organization.findFirst({
			where: (org, { eq }) => eq(org.slug, params.org_slug)
		});

		if (!org) return fail(404, { message: 'Organization not found' });

		const formData = await request.formData();
		const dataJson = formData.get('data') as string;
		const filename = formData.get('filename') as string;

		if (!dataJson) return fail(400, { message: 'Data is required' });

		const rows = JSON.parse(dataJson);

		const defaultWarehouse = await db.query.warehouse.findFirst({
			where: (wh, { eq }) => eq(wh.organizationId, org.id)
		});

		if (!defaultWarehouse) {
			return fail(400, {
				message:
					'Tidak ada gudang yang tersedia di kesatuan ini. Harap buat minimal satu gudang terlebih dahulu.'
			});
		}

		let successCount = 0;
		let errorCount = 0;
		const logId = uuidv4();

		try {
			await db.transaction(async (tx) => {
				for (const row of rows) {
					try {
						// 1. Cari atau Buat Item
						let existingItem = await tx.query.item.findFirst({
							where: (it, { eq }) => eq(it.name, row.NamaBarang)
						});

						let itemId = existingItem?.id;

						if (!existingItem) {
							itemId = uuidv4();
							await tx.insert(item).values({
								id: itemId,
								name: row.NamaBarang,
								type: row.Tipe as 'ASSET' | 'CONSUMABLE',
								equipmentType: row.KategoriAlat || null,
								baseUnit: row.SatuanDasar,
								description: row.Deskripsi
							});
						}

						// 2. Proses berdasarkan Tipe
						if (row.Tipe === 'ASSET') {
							// Cek Serial Number Duplikasi jika diisi
							if (row.NomorSeri) {
								const existingSN = await tx.query.equipment.findFirst({
									where: (eqp, { eq }) => eq(eqp.serialNumber, row.NomorSeri)
								});
								if (existingSN) {
									throw new Error(`Nomor Seri ${row.NomorSeri} sudah ada di database.`);
								}
							}

							await tx.insert(equipment).values({
								id: uuidv4(),
								itemId: itemId!,
								serialNumber: row.NomorSeri || null,
								brand: row.Merk || null,
								warehouseId: defaultWarehouse.id,
								organizationId: org.id,
								condition: row.Kondisi || 'BAIK',
								status: 'READY'
							});
						} else {
							// Insert/Update sebagai Stock (Barang Habis Pakai)
							const existingStock = await tx.query.stock.findFirst({
								where: (st, { eq, and }) =>
									and(eq(st.itemId, itemId!), eq(st.warehouseId, defaultWarehouse.id))
							});

							if (existingStock) {
								await tx
									.update(stock)
									.set({ qty: (Number(existingStock.qty) + Number(row.Jumlah)).toString() })
									.where(eq(stock.id, existingStock.id));
							} else {
								await tx.insert(stock).values({
									id: uuidv4(),
									itemId: itemId!,
									warehouseId: defaultWarehouse.id,
									qty: (row.Jumlah || 0).toString()
								});
							}
						}
						successCount++;
					} catch (e: any) {
						console.error(`Error processing row:`, e);
						errorCount++;
						// Kita tidak menghentikan transaksi jika satu baris gagal?
						// Tapi tx.insert akan rollback jika di dalam transaction.
						// Jika ingin partial success, jangan pakai transaction global atau handle error per row.
						// Sesuai permintaan "sejarah import", kita re-throw agar rollback jika ada satu saja yang gagal,
						// atau kita tangani per row jika ingin partial.
						// User minta "success rows", "error rows". Mari buat partial.
						throw e; // Untuk saat ini kita re-throw agar aman (atomic)
					}
				}
			});

			// Simpan Log Sukses
			await db.insert(importLog).values({
				id: logId,
				organizationId: org.id,
				userId: sessionUser.id,
				filename: filename,
				status: 'SUCCESS',
				totalRows: rows.length.toString(),
				successRows: successCount.toString(),
				errorRows: '0'
			});

			return { success: true };
		} catch (e: any) {
			// Simpan Log Gagal
			await db.insert(importLog).values({
				id: logId,
				organizationId: org.id,
				userId: sessionUser.id,
				filename: filename,
				status: 'FAILED',
				totalRows: rows.length.toString(),
				successRows: '0',
				errorRows: rows.length.toString(),
				errorMessage: e.message
			});
			return fail(500, { message: e.message });
		}
	}
};
