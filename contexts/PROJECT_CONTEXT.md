# MINMAT - SISTEM INFORMASI LOGISTIK MATKOMLEK

## 1. Ringkasan Proyek

Aplikasi **MINMAT** adalah sistem informasi logistik terintegrasi untuk **Matkomlek (Materi Komunikasi dan Elektronika)** di lingkungan TNI Angkatan Darat, dikelola oleh **Pusat Komunikasi dan Elektronika Angkatan Darat (Puskomlekad)**. Sistem ini menghubungkan pusat data, gudang pusat, gudang daerah, dan satuan jajaran (Kodam, Kostrad, Kopassus, Pusdik, Bengpus) untuk memonitor alat komunikasi dan elektronika secara real-time.

**Tujuan utama:**

- Integrasi data logistik nasional
- Monitoring alat komunikasi dan elektronika
- Sentralisasi database material
- Manajemen stok, peminjaman, pemeliharaan, dan distribusi
- Pelaporan standar militer (BTK-16, Pernika, dll.)

## 2. Core Tech Stack

- **Framework:** SvelteKit 2.x
- **Compiler:** Svelte 5 (Runes)
- **Runtime:** Bun
- **Bahasa:** TypeScript (strict mode)
- **Database:** MySQL (via Drizzle ORM)
- **Autentikasi & Otorisasi:** Better Auth (dengan tabel kustom)
- **ORM:** Drizzle ORM (schema definitions, relations, migrations)
- **Styling:** Tailwind CSS
- **Deployment:** Server aplikasi di data center Puskomlekad dengan load balancer, firewall, dan backup server.

## 3. Struktur Database (Drizzle ORM)

Database dirancang dengan pendekatan **multi‑tenant** melalui organisasi bertingkat (parent‑child). Semua tabel menggunakan UUID (`varchar(36)`) sebagai primary key.

### 3.1 Tabel Inti

| Tabel                  | Deskripsi                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `organization`         | Kesatuan (Mabes / Wilayah / Satuan), memiliki relasi parent‑child.                                            |
| `user`                 | Pengguna sistem (terintegrasi dengan Better Auth).                                                            |
| `member`               | Relasi user dengan organisasi, dilengkapi `role` untuk RBAC.                                                  |
| `warehouse`            | Gudang pusat/daerah, terikat pada satu organisasi.                                                            |
| `item`                 | Barang logistik (asset atau consumable) dengan satuan dasar (`baseUnit`).                                     |
| `equipment`            | Unit spesifik dari item (aset individual), memiliki serial number, brand, kondisi, status, dan lokasi gudang. |
| `stock`                | Stok item konsumable di gudang tertentu (qty).                                                                |
| `stock_movement`       | Pergerakan stok (IN, OUT, ADJUSTMENT, TRANSFER) untuk item konsumable.                                        |
| `inventory_movement`   | Pergerakan equipment (MASUK, KELUAR, PINJAM, KEMBALI, DISTRIBUSI).                                            |
| `lending`              | Peminjaman equipment untuk operasi/latihan.                                                                   |
| `lending_item`         | Detail equipment yang dipinjam dalam satu peminjaman.                                                         |
| `maintenance`          | Perawatan/perbaikan equipment.                                                                                |
| `distribution`         | Distribusi antar organisasi (DRAFT, APPROVED, SHIPPED, RECEIVED).                                             |
| `approval`             | Approval workflow untuk lending, distribution, maintenance.                                                   |
| `audit_log`            | Catatan semua aktivitas pengguna (siapa, aksi, tabel, record, nilai lama/baru).                               |
| `report_btk16`         | Laporan BTK-16 (opening balance, incoming, outgoing, closing) per periode.                                    |
| `item_unit_conversion` | Konversi satuan antar unit (misal: 1 BOX = 10 PCS) untuk item.                                                |

### 3.2 Tabel Better Auth (Kustom)

Better Auth menggunakan tabel standar dengan relasi ke `user`:

- `session`
- `account`
- `verification`
- `api_key`

Semua tabel ini telah diintegrasikan dengan `relations` Drizzle.

### 3.3 Relasi Utama

- `organization` → `warehouse` (one-to-many)
- `organization` → `member` (one-to-many) → `user`
- `item` → `equipment` (one-to-many)
- `item` → `stock` (one-to-many)
- `equipment` → `warehouse` (many-to-one)
- `lending` → `lending_item` (one-to-many) → `equipment`
- `stock_movement` → `item` & `warehouse`
- `inventory_movement` → `equipment` & `from/to warehouse`

### 3.4 Constraints & Indexes

- **Unique:** `serial_number` pada equipment, `stock_unique_idx` pada `(itemId, warehouseId)`, kombinasi `(itemId, fromUnit, toUnit)` pada konversi satuan.
- **Indexes:** pada kolom yang sering difilter (`type`, `condition`, `itemId`, dll.) untuk performa.

## 4. Modul Aplikasi & Pemetaan ke Database

### 4.1 Modul Dashboard

Menampilkan ringkasan: total equipment, kondisi, distribusi, statistik peminjaman. Data diambil dari agregasi `equipment`, `stock`, `lending`, `inventory_movement`.

### 4.2 Modul Stock Gudang

Mengelola stok barang konsumable (`item` dengan `type = 'CONSUMABLE'`) di setiap gudang (`warehouse`). Tabel terkait: `stock`, `stock_movement`.

### 4.3 Modul Data Alkomlek

Database peralatan komunikasi (`equipment` dengan `type = 'ALKOMLEK'`). Setiap equipment terhubung ke `item` sebagai kategorinya.

### 4.4 Modul Pernika & Lek

Database perangkat elektronika (`equipment` dengan `type = 'PERNIKA_LEK'`), juga terhubung ke `item`.

### 4.5 Modul Pemeliharaan

Mencatat perawatan/perbaikan equipment (`maintenance`). Status: PENDING, IN_PROGRESS, COMPLETED.

### 4.6 Modul Peminjaman

Peminjaman equipment untuk operasi/latihan. Melibatkan tabel `lending`, `lending_item`, serta `inventory_movement` untuk mencatat pergerakan fisik.

### 4.7 Modul Distribusi

Distribusi antar organisasi (`distribution`) dengan alur persetujuan (`approval`).

### 4.8 Modul Laporan

- **BTK-16:** Laporan stok periodik (`report_btk16`).
- **Laporan Pernika & Kondisi Alat:** Di-generate dari `equipment`, `maintenance`, `stock_movement`, dll.

### 4.9 Modul Approval & Audit

Semua transaksi penting (lending, distribution, maintenance) melalui tabel `approval`. Semua aktivitas tercatat di `audit_log`.

## 5. Arsitektur Sistem

```
[Client Layer] → Browser / Mobile App (HTTPS)
       ↓
[Network Layer] → Military VPN, Firewall, IDS/IPS
       ↓
[Load Balancer] → Application Server Cluster (SvelteKit)
       ↓
[Service Layer] → API (REST/GraphQL) – modul bisnis
       ↓
[Data Layer]    → MySQL (Drizzle ORM) + Backup Server
```

- **Application Server:** SvelteKit dijalankan dengan runtime Bun, menangani SSR, API routes, dan autentikasi.
- **Service Layer:** API endpoint untuk setiap modul, mengakses database via Drizzle.
- **Data Layer:** MySQL dengan indeks yang sesuai, backup harian/mingguan/bulanan, disaster recovery ke data center cadangan.
- **Keamanan:**
  - Better Auth menangani autentikasi (email/password, OAuth, api_key) dengan session dan 2FA (jika diaktifkan).
  - RBAC berbasis `member.role` di setiap organisasi.
  - Enkripsi data sensitif, HTTPS, audit log.
  - Firewall dan VPN militer untuk akses jaringan.

## 6. Fitur Keamanan & RBAC

- Setiap user terdaftar di `user` dan memiliki keanggotaan di satu atau lebih organisasi (`member`).
- Role ditentukan di kolom `role` (contoh: 'admin', 'operator_gudang', 'pimpinan', 'teknisi').
- Otorisasi dilakukan dengan mengecek `member` dan `role` pada resource terkait (misal: hanya operator gudang tertentu yang bisa mengedit stok di gudangnya).
- Audit log mencatat setiap perubahan data penting (siapa, kapan, tabel, record, old/new value).

## 7. Alur Data Contoh (Peminjaman Alat)

1. **Request:** User mengajukan peminjaman (`lending` dengan status DRAFT, `lending_item`).
2. **Approval:** Atasan menyetujui melalui `approval` → status LENDING berubah menjadi APPROVED.
3. **Pergerakan:** Petugas gudang mencatat equipment keluar → `inventory_movement` (MASUK? sebenarnya KELUAR, dengan `movementType = 'PINJAM'`).
4. **Pengembalian:** Saat alat kembali, dibuat `inventory_movement` dengan `movementType = 'KEMBALI'`, status LENDING berubah menjadi KEMBALI.
5. **Audit:** Semua langkah tercatat di `audit_log`.

## 8. Teknologi Pendukung

- **Drizzle ORM:** Schema didefinisikan dengan tipe aman, mendukung relations, migrations via drizzle-kit.
- **Better Auth:** Library autentikasi SvelteKit yang fleksibel; kita menggunakan adapter Drizzle dengan tabel kustom.
- **Svelte 5 Runes:** State management reaktif, memudahkan pembuatan UI interaktif.
- **Tailwind CSS:** Styling cepat dan konsisten.

## 9. Kesimpulan

Proyek MINMAT adalah sistem informasi logistik berskala nasional dengan arsitektur modern, aman, dan terintegrasi. Database telah dirancang untuk mendukung kebutuhan operasional militer: manajemen aset, stok konsumable, peminjaman, pemeliharaan, distribusi, dan pelaporan. Dengan menggunakan SvelteKit, Drizzle, dan Better Auth, aplikasi siap dikembangkan dengan performa tinggi dan maintainability baik.

Dokumen ini memberikan konteks menyeluruh bagi agen LLM untuk memahami struktur, fitur, dan tujuan sistem.
