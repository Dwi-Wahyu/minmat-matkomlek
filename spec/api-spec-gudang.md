# API Specification: Gudang (Balkir, Komunity, Transito)

Dokumen ini menjelaskan spesifikasi API untuk modul Gudang pada aplikasi Inventory Puskomlekad. Semua endpoint memerlukan autentikasi dan akses organisasi yang validmelalui `locals.user`.

## Dasar URL
`GET /api/[org_slug]/gudang/`

---

## 1. Gudang Balkir (Barang Terkirim)
Mengambil data mutasi barang dengan klasifikasi `BALKIR` atau yang terkait dengan organisasi pengguna.

- **Endpoint:** `GET /api/[org_slug]/gudang/balkir`
- **Method:** `GET`
- **Query Parameters:**
  - `name` (string, optional): Filter berdasarkan nama barang (menggunakan `LIKE %name%`).
  - `type` (string, optional): Filter berdasarkan tipe barang (`ASSET` atau `CONSUMABLE`).

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "asset | consumable",
      "nama": "Nama Barang",
      "tipe": "ASSET | CONSUMABLE",
      "kategori": "ALKOMLEK | PERNIKA_LEK | null",
      "sn": "Serial Number | null",
      "qty": 1,
      "satuan": "PCS | UNIT | dll",
      "kondisi": "BAIK | RUSAK_RINGAN | RUSAK_BERAT | null",
      "lokasi": "Nama Lokasi Spesifik",
      "tglMasuk": "ISO Date String",
      "organizationName": "Internal | Nama Org",
      "fromWarehouse": "Nama Gudang Asal",
      "classification": "BALKIR",
      "eventType": "RECEIVE | ISSUE | dll"
    }
  ]
}
```

---

## 2. Gudang Komunity (Satuan Pemakai)
Mengambil ringkasan stok barang (Asset & Consumable) yang berada di komunitas/satuan pemakai berdasarkan riwayat mutasi `KOMUNITY`.

- **Endpoint:** `GET /api/[org_slug]/gudang/komunity`
- **Method:** `GET`
- **Query Parameters:**
  - `name` (string, optional): Filter berdasarkan nama barang.
  - `type` (string, optional): Filter berdasarkan tipe barang (`ASSET` atau `CONSUMABLE`).

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "ASSET | CONSUMABLE",
      "matkomplek": "Serial Number | -",
      "namaBarang": "Nama Barang",
      "stok": 10,
      "masuk": 15,
      "keluar": 5,
      "sisaBaik": 10,
      "sisaRR": 0,
      "sisaRB": 0,
      "kondisi": "BAIK",
      "keterangan": "-",
      "tahun": 2024,
      "equipmentType": "ALKOMLEK | null",
      "baseUnit": "PCS"
    }
  ]
}
```

---

## 3. Gudang Transito (Penyimpanan Sementara)
Mengambil data mutasi barang dengan klasifikasi `TRANSITO` milik organisasi terkait.

- **Endpoint:** `GET /api/[org_slug]/gudang/transito`
- **Method:** `GET`
- **Query Parameters:**
  - `name` (string, optional): Filter berdasarkan nama barang.
  - `type` (string, optional): Filter berdasarkan tipe barang (`ASSET` atau `CONSUMABLE`).

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "asset | consumable",
      "nama": "Nama Barang",
      "serialNumber": "SN | null",
      "kategori": "ALKOMLEK | null",
      "notes": "Catatan",
      "qty": 1,
      "unit": "PCS | dll",
      "createdAt": "ISO Date String",
      "eventType": "RECEIVE | ISSUE | dll"
    }
  ]
}
```

---

## Common Error Responses

- **401 Unauthorized:** Sesi tidak valid atau pengguna belum login/tidak memiliki akses organisasi.
- **500 Internal Server Error:** Terjadi kesalahan pada server.
```json
{
  "success": false,
  "message": "Error message description"
}
```
