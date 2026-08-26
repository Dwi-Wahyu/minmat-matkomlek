import { db } from '$lib/server/db';
import { item, equipment, stock, warehouse, importLog, user, unit } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { error, fail } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

export const load: import('./$types').PageServerLoad = async ({ params, locals }) => {
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
			filepath: importLog.filepath,
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
	import: async ({ request, params, locals }: any) => {
		const sessionUser = locals.user;
		if (!sessionUser) return fail(401, { message: 'Unauthorized' });

		const org = await db.query.organization.findFirst({
			where: (org, { eq }) => eq(org.slug, params.org_slug)
		});

		if (!org) return fail(404, { message: 'Organization not found' });

		const formData = await request.formData();
		const dataJson = formData.get('data') as string;
		const filename = formData.get('filename') as string;
		const file = formData.get('file') as File;

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

		// Handle File Upload
		let savedFilePath = null;
		if (file && file instanceof File && file.size > 0) {
			try {
				const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'import');
				if (!fs.existsSync(uploadDir)) {
					fs.mkdirSync(uploadDir, { recursive: true });
				}
				const fileExt = path.extname(filename) || '.xlsx';
				const newFilename = `${uuidv4()}${fileExt}`;
				savedFilePath = `/uploads/import/${newFilename}`;
				const fullPath = path.join(uploadDir, newFilename);

				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);
				fs.writeFileSync(fullPath, buffer);
			} catch (err) {
				console.error('Failed to save import file:', err);
			}
		}

		let successCount = 0;
		const logId = uuidv4();

		try {
			await db.transaction(async (tx) => {
				for (const row of rows) {
					try {
						// 1. Cari atau Buat Unit jika belum ada
						if (row.SatuanDasar) {
							const unitName = row.SatuanDasar.toString().toUpperCase();
							const existingUnit = await tx.query.unit.findFirst({
								where: (u, { eq }) => eq(u.name, unitName)
							});
							if (!existingUnit) {
								await tx.insert(unit).values({
									id: unitName,
									name: unitName,
									createdAt: new Date()
								});
							}
						}

						// 2. Cari atau Buat Item
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
								baseUnit: row.SatuanDasar?.toString().toUpperCase(),
								description: row.Deskripsi,
								createdAt: new Date()
							});
						}

						// 3. Proses berdasarkan Tipe
						if (row.Tipe === 'ASSET') {
							// Cek Serial Number Duplikasi jika diisi
							if (row.NomorSeri) {
								const existingSN = await tx.query.equipment.findFirst({
									where: (eqp, { eq }) => eq(eqp.serialNumber, row.NomorSeri.toString())
								});
								if (existingSN) {
									throw new Error(`Nomor Seri ${row.NomorSeri} sudah ada di database.`);
								}
							}

							await tx.insert(equipment).values({
								id: uuidv4(),
								itemId: itemId!,
								serialNumber: row.NomorSeri?.toString() || null,
								brand: row.Merk?.toString() || null,
								warehouseId: defaultWarehouse.id,
								organizationId: org.id,
								condition: (row.Kondisi?.toString() || 'BAIK').toUpperCase() as any,
								status: 'READY',
								createdAt: new Date()
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
									.set({
										qty: (Number(existingStock.qty) + Number(row.Jumlah || 0)).toString(),
										updatedAt: new Date()
									})
									.where(eq(stock.id, existingStock.id));
							} else {
								await tx.insert(stock).values({
									id: uuidv4(),
									itemId: itemId!,
									warehouseId: defaultWarehouse.id,
									qty: (row.Jumlah || 0).toString(),
									updatedAt: new Date()
								});
							}
						}
						successCount++;
					} catch (e: any) {
						console.error(`Error processing row:`, e);
						throw e;
					}
				}
			});

			// Simpan Log Sukses
			await db.insert(importLog).values({
				id: logId,
				organizationId: org.id,
				userId: sessionUser.id,
				filename: filename,
				filepath: savedFilePath,
				status: 'SUCCESS',
				totalRows: rows.length.toString(),
				successRows: successCount.toString(),
				errorRows: '0',
				createdAt: new Date()
			});

			return { success: true };
		} catch (e: any) {
			// Simpan Log Gagal
			await db.insert(importLog).values({
				id: logId,
				organizationId: org.id,
				userId: sessionUser.id,
				filename: filename,
				filepath: savedFilePath,
				status: 'FAILED',
				totalRows: rows.length.toString(),
				successRows: '0',
				errorRows: rows.length.toString(),
				errorMessage: e.message,
				createdAt: new Date()
			});
			return fail(500, { message: e.message });
		}
	}
};
