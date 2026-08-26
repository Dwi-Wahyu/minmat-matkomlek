# Panduan Deployment - Minmat Puskomlekad

Dokumen ini menjelaskan langkah-langkah untuk melakukan deployment aplikasi **Minmat Puskomlekad** menggunakan Docker.

## Prasyarat

- **Docker** dan **Docker Compose** terinstal di server.
- Domain atau alamat IP publik.
- Akses terminal (SSH) ke server.

## 1. Persiapan Environment

Salin file `.env.example` menjadi `.env` dan sesuaikan nilai-nilainya:

```bash
cp .env.example .env
nano .env
```

### Konfigurasi Penting:

- `DATABASE_URL`: Format `mysql://user:password@db:3306/db_name` (Gunakan `db` sebagai host jika menggunakan Docker).
- `REDIS_URL`: `redis://redis:6379`.
- `BETTER_AUTH_SECRET`: Generate string acak panjang (min 32 karakter).
- `BETTER_AUTH_URL`: URL lengkap aplikasi (contoh: `https://inventory.puskomlekad.mil.id`).

## 2. Struktur Folder Data

Aplikasi ini menggunakan _bind mounts_ untuk menyimpan data agar tidak hilang saat container dihapus. Pastikan folder berikut tersedia di direktori proyek:

```bash
mkdir -p mysql_data
mkdir -p static/uploads
```

## 3. Deployment dengan Docker Compose

### Build dan Jalankan Container

Jalankan perintah berikut untuk membangun image dan menjalankan semua layanan (Database, Redis, dan App) di background:

```bash
docker compose up -d --build
```

### Verifikasi Layanan

Pastikan semua container berjalan dengan baik:

```bash
docker compose ps
```

## 4. Inisialisasi Database

Setelah container database berjalan, Anda perlu menjalankan migrasi dan seeding data awal:

### Jalankan Migrasi Drizzle

```bash
docker compose exec app bun run db:push
```

### Jalankan Seeding (Opsional)

Untuk mengisi data awal/dummy:

```bash
docker compose exec app bun run db:seed-puskomlekad
```

## 5. Pemeliharaan & Monitoring

### Melihat Log Aplikasi

```bash
docker compose logs -f app
```

### Membersihkan Cache Redis

Jika Anda perlu membersihkan semua cache laporan secara manual:

```bash
docker compose exec redis redis-cli flushall
```

### Update Aplikasi

Jika ada perubahan kode (setelah `git pull`):

```bash
docker compose up -d --build
```

## 6. Backup Data

Sangat disarankan untuk membackup folder `mysql_data` dan `static/uploads` secara berkala.

**Contoh Backup Database via Docker:**

```bash
docker exec minmat_puskomlekad_database mysqldump -u[user] -p[password] [db_name] > backup.sql
```

---

**Catatan Keamanan:**

- Jangan pernah membagikan file `.env` ke public repository.
- Pastikan port `3306` dan `6379` tidak dibuka untuk publik melalui firewall (hanya bisa diakses secara internal oleh container atau via localhost).
