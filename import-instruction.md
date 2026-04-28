# Panduan Import Data Alat dan Barang (XLSX) - Tanpa Input Gudang

Dokumen ini berisi instruksi untuk AI dalam membuat template XLSX dan contoh kode SvelteKit/Node.js untuk memproses data tersebut. Sistem akan otomatis menggunakan gudang yang tersedia di kesatuan.

## 1. Format Kolom XLSX (Template)

Berikan instruksi berikut ke AI (seperti ChatGPT/Claude) untuk membuatkan file template:

---
**Prompt untuk AI pembuat template:**
"Buatlah sebuah template Excel (XLSX) untuk import inventory dengan kolom-kolom berikut. Tambahkan validasi data (dropdown) pada kolom yang memiliki opsi terbatas (Enum):

1.  **Nama Barang** (Wajib): Nama barang/peralatan.
2.  **Tipe** (Wajib - Dropdown): `ASSET` (untuk alat/barang satuan) atau `CONSUMABLE` (untuk barang habis pakai/stok).
3.  **Kategori Alat** (Opsional - Dropdown): `ALKOMLEK` atau `PERNIKA_LEK`. Hanya diisi jika Tipe = ASSET.
4.  **Satuan Dasar** (Wajib - Dropdown): `PCS`, `BOX`, `METER`, `ROLL`, `UNIT`, `SET`, `BUAH`, `LOT`, `PAKET`, `CABINET`.
5.  **Deskripsi** (Opsional): Keterangan tambahan barang.
6.  **Merk** (Opsional): Merk barang (disarankan diisi jika ASSET).
7.  **Nomor Seri** (Opsional): Nomor seri unik. Wajib diisi jika ASSET dan barang memiliki serial.
8.  **Kondisi** (Wajib - Dropdown): `BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`. Default: `BAIK`.
9.  **Jumlah** (Wajib): Jumlah barang. Jika Tipe = ASSET, jumlah harus 1 per baris (jika ada nomor seri). Jika Tipe = CONSUMABLE, isi sesuai stok yang ada.

Berikan juga 3 contoh data dummy: 1 untuk Radio (ASSET), 1 untuk Kabel (CONSUMABLE), dan 1 untuk Antena (ASSET)."
---

## 2. Logika Konsumsi Data (Backend)

Fungsi ini akan otomatis mencari gudang pertama yang tersedia untuk `organizationId` user.

```typescript
import { db } from '$lib/server/db';
import { item, equipment, stock, warehouse } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function processImport(rows: any[], organizationId: string) {
	// AMBIL GUDANG PERTAMA YANG TERSEDIA DI KESATUAN INI
	const defaultWarehouse = await db.query.warehouse.findFirst({
		where: (wh, { eq }) => eq(wh.organizationId, organizationId)
	});

	if (!defaultWarehouse) {
		throw new Error("Tidak ada gudang yang tersedia di kesatuan ini. Harap buat minimal satu gudang terlebih dahulu.");
	}

	for (const row of rows) {
		// 1. Cari atau Buat Item
		let existingItem = await db.query.item.findFirst({
			where: (it, { eq }) => eq(it.name, row.NamaBarang)
		});

		let itemId = existingItem?.id;

		if (!existingItem) {
			itemId = uuidv4();
			await db.insert(item).values({
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
			// Insert sebagai Equipment (Alat Satuan)
			await db.insert(equipment).values({
				id: uuidv4(),
				itemId: itemId!,
				serialNumber: row.NomorSeri,
				brand: row.Merk,
				warehouseId: defaultWarehouse.id, // Otomatis pakai gudang yang ditemukan
				organizationId: organizationId,
				condition: row.Kondisi || 'BAIK',
				status: 'READY'
			});
		} else {
			// Insert/Update sebagai Stock (Barang Habis Pakai)
			const existingStock = await db.query.stock.findFirst({
				where: (st, { eq, and }) => 
					and(eq(st.itemId, itemId!), eq(st.warehouseId, defaultWarehouse.id))
			});

			if (existingStock) {
				await db.update(stock)
					.set({ qty: (Number(existingStock.qty) + Number(row.Jumlah)).toString() })
					.where(eq(stock.id, existingStock.id));
			} else {
				await db.insert(stock).values({
					id: uuidv4(),
					itemId: itemId!,
					warehouseId: defaultWarehouse.id,
					qty: row.Jumlah.toString()
				});
			}
		}
	}
}
```

## 3. Catatan Penting
- **Otomatisasi Gudang:** User tidak perlu pusing memilih gudang. Sistem akan memasukkan ke gudang mana pun yang sudah dibuat sebelumnya di kesatuan tersebut.
- **Prasyarat:** Pastikan minimal ada 1 gudang yang sudah dibuat di menu Master Gudang untuk kesatuan Anda sebelum menjalankan import ini.
