# API Specification: Item (Asset & Consumable)

Dokumen ini menjelaskan spesifikasi API untuk modul Item pada aplikasi Inventory Puskomlekad. Semua endpoint memerlukan autentikasi dan akses organisasi yang valid.

## Dasar URL
`GET /api/[org_slug]/item/`

---

## 1. Item Asset (Peralatan)
Mengambil daftar peralatan individu (equipment) milik organisasi pengguna dengan dukungan paginasi.

- **Endpoint:** `GET /api/[org_slug]/item/asset`
- **Method:** `GET`
- **Query Parameters:**
  - `name` (string, optional): Filter berdasarkan nama barang.
  - `condition` (string, optional): Filter berdasarkan kondisi (`BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`).
  - `page` (number, optional, default: 1): Halaman yang ingin diambil.
  - `limit` (number, optional, default: 10): Jumlah data per halaman.

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Nama Barang",
      "sn": "Serial Number",
      "brand": "Merk",
      "kondisi": "BAIK | RUSAK_RINGAN | RUSAK_BERAT",
      "status": "READY | IN_USE | TRANSIT | MAINTENANCE",
      "gudang": "Nama Gudang",
      "tipe": "ALKOMLEK | PERNIKA_LEK"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10
  }
}
```

---

## 1.1 Detail Asset (Single Equipment)
Mendapatkan informasi detail untuk satu unit aset spesifik (Equipment), termasuk riwayat pergerakan dan pemeliharaan.

- **Endpoint:** `GET /api/[org_slug]/item/asset/[id]`
- **Method:** `GET`
- **Path Parameters:**
  - `org_slug` (string): Slug organisasi.
  - `id` (uuid): ID unik peralatan (`equipment.id`).

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid-equipment",
    "serialNumber": "SN-ALK-101",
    "brand": "Motorola",
    "condition": "BAIK",
    "status": "READY",
    "imagePath": "path/to/image.png",
    "image": "/uploads/equipment/path/to/image.png",
    "createdAt": "2026-03-20T08:00:00.000Z",
    "updatedAt": "2026-04-01T10:30:00.000Z",
    "item": {
      "id": "uuid-item",
      "name": "Handy Talky (HT) V1",
      "type": "ASSET",
      "equipmentType": "ALKOMLEK",
      "baseUnit": "PCS",
      "description": "Perangkat komunikasi genggam standar"
    },
    "warehouse": {
      "id": "uuid-warehouse",
      "name": "Gudang Utama Hubdam",
      "location": "Makassar, Sulsel"
    },
    "movements": [
      {
        "id": "uuid-movement",
        "eventType": "RECEIVE",
        "qty": "1.0000",
        "unit": "PCS",
        "classification": "TRANSITO",
        "specificLocationName": "Meja Penerimaan",
        "notes": "Penerimaan aset baru",
        "createdAt": "2026-03-20T08:05:00.000Z",
        "fromWarehouse": null,
        "toWarehouse": { "id": "uuid-warehouse", "name": "Gudang Utama Hubdam" },
        "pic": { "id": "uuid-user", "name": "Budi Santoso" }
      }
    ],
    "maintenances": [
      {
        "id": "uuid-maintenance",
        "maintenanceType": "PERAWATAN",
        "description": "Pengecekan baterai rutin",
        "scheduledDate": "2026-05-01T00:00:00.000Z",
        "completionDate": null,
        "status": "PENDING",
        "createdAt": "2026-04-01T10:30:00.000Z",
        "technician": { "id": "uuid-user", "name": "Andi Wijaya" }
      }
    ]
  }
}
```

---

## 2. Item Consumable (Bahan)
Mengambil daftar barang habis pakai beserta total stoknya di organisasi pengguna dengan dukungan paginasi.

- **Endpoint:** `GET /api/[org_slug]/item/consumable`
- **Method:** `GET`
- **Query Parameters:**
  - `name` (string, optional): Filter berdasarkan nama barang.
  - `page` (number, optional, default: 1): Halaman yang ingin diambil.
  - `limit` (number, optional, default: 10): Jumlah data per halaman.

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nama": "Nama Barang",
      "satuan": "PCS | BOX | dll",
      "deskripsi": "Deskripsi barang",
      "totalStok": 150,
      "lokasi": "Gudang A, Gudang B"
    }
  ],
  "pagination": {
  "page": 1,
  "limit": 10
  }
  }
  ```

  ---

  ## 2.1 Detail Consumable (Single Item)
  Mendapatkan informasi detail untuk satu barang habis pakai, termasuk stok di berbagai gudang, riwayat mutasi, dan aturan konversi satuan.

  - **Endpoint:** `GET /api/[org_slug]/item/consumable/[id]`
  - **Method:** `GET`
  - **Path Parameters:**
  - `org_slug` (string): Slug organisasi.
  - `id` (uuid): ID unik barang (`item.id`).

  ### Response (200 OK)
  ```json
  {
  "success": true,
  "data": {
  "id": "uuid-item",
  "name": "Baterai AA Alkaline",
  "type": "CONSUMABLE",
  "baseUnit": "PCS",
  "description": "Baterai untuk perangkat radio portabel",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "stocks": [
    {
      "id": "uuid-stock",
      "qty": "150.0000",
      "updatedAt": "2026-04-01T15:00:00.000Z",
      "warehouse": {
        "id": "uuid-warehouse",
        "name": "Gudang Komlek A",
        "location": "Jakarta Timur"
      }
    }
  ],
  "movements": [
    {
      "id": "uuid-movement",
      "eventType": "ISSUE",
      "qty": "20.0000",
      "unit": "PCS",
      "notes": "Pengeluaran untuk latihan rutin",
      "createdAt": "2026-04-01T15:00:00.000Z",
      "fromWarehouse": { "id": "uuid-warehouse", "name": "Gudang Komlek A" },
      "toWarehouse": null,
      "pic": { "id": "uuid-user", "name": "Sertu Junaedi" }
    }
  ],
  "unitConversions": [
    {
      "id": "uuid-conv",
      "fromUnit": "BOX",
      "toUnit": "PCS",
      "multiplier": "12.0000"
    }
  ]
  }
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
