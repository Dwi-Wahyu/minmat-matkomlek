# API Specification for Mobile - Item (Asset & Consumable)

Dokumentasi ringkas API untuk integrasi frontend mobile.

---

## 1. Daftar Item Asset (Alat/Peralatan)
Digunakan untuk menampilkan daftar inventaris yang memiliki nomor seri (alkomlek, pernika, dll).

**Endpoint:** `GET /api/[org_slug]/item/asset`

**Struktur Data:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-alat-1",
      "nama": "Radio HT Motorola XPR 7550",
      "sn": "SN-9928374",
      "brand": "Motorola",
      "kondisi": "BAIK",
      "status": "READY",
      "gudang": "Gudang A",
      "tipe": "ALKOMLEK",
      "image": "/uploads/item/image-ht.jpg"
    }
  ],
  "pagination": { "page": 1, "limit": 10 }
}
```

---

## 2. Detail Item Asset
Digunakan untuk melihat riwayat mutasi dan pemeliharaan spesifik satu alat.

**Endpoint:** `GET /api/[org_slug]/item/asset/[id]`

**Struktur Data:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-alat-1",
    "serialNumber": "SN-9928374",
    "brand": "Motorola",
    "condition": "BAIK",
    "status": "READY",
    "item": {
      "name": "Radio HT Motorola XPR 7550",
      "equipmentType": "ALKOMLEK",
      "description": "Radio genggam digital..."
    },
    "image": "/uploads/item/image-ht.jpg",
    "movements": [
      {
        "eventType": "RECEIVE",
        "notes": "Barang masuk dari pusat",
        "createdAt": "2024-03-20T..."
      }
    ],
    "maintenances": [
      {
        "maintenanceType": "PERAWATAN",
        "status": "COMPLETED",
        "description": "Pengecekan baterai rutin"
      }
    ]
  }
}
```

---

## 3. Daftar Item Consumable (Barang Habis Pakai)
Digunakan untuk menampilkan stok bahan atau barang yang dihitung berdasarkan kuantitas.

**Endpoint:** `GET /api/[org_slug]/item/consumable`

**Struktur Data:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-bahan-1",
      "nama": "Baterai AA",
      "satuan": "PCS",
      "totalStok": 150,
      "lokasi": "Gudang A, Gudang B",
      "image": "/uploads/item/battery.png"
    }
  ],
  "pagination": { "page": 1, "limit": 10 }
}
```

---

## 4. Detail Item Consumable
Digunakan untuk melihat sebaran stok di berbagai gudang dan riwayat mutasi stok.

**Endpoint:** `GET /api/[org_slug]/item/consumable/[id]`

**Struktur Data:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-bahan-1",
    "name": "Baterai AA",
    "baseUnit": "PCS",
    "description": "Baterai alkaline 1.5V",
    "image": "/uploads/item/battery.png",
    "stocks": [
      { "qty": "100.0000", "warehouse": { "name": "Gudang A" } },
      { "qty": "50.0000", "warehouse": { "name": "Gudang B" } }
    ],
    "movements": [
      {
        "eventType": "ADJUSTMENT",
        "qty": "10.0000",
        "notes": "Koreksi stok opname",
        "pic": { "name": "Admin Gudang" }
      }
    ]
  }
}
```

---

## Catatan untuk Mobile:
*   **Base URL Image:** Field `image` mengembalikan path relatif. Gabungkan dengan domain server (misal: `https://api.inventory.com/uploads/item/...`).
*   **Enum Kondisi:** `BAIK`, `RUSAK_RINGAN`, `RUSAK_BERAT`.
*   **Enum Status:** `READY`, `IN_USE`, `TRANSIT`, `MAINTENANCE`.
*   **Tipe Asset:** `ALKOMLEK` (Alat Komunikasi Elektronik), `PERNIKA_LEK` (Pernika & Lek).
