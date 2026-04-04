# API Specification: Item Detail

Mengambil informasi lengkap sebuah barang, termasuk stok di gudang, daftar aset (jika tipe ASSET), riwayat mutasi terakhir, dan aturan konversi satuan.

- **Endpoint:** `GET /api/[org_slug]/item/[id]`
- **Authentication:** Required (Session/Cookie)
- **Role Access:** Member of the organization defined by `org_slug`

---

## Path Parameters

| Parameter | Tipe | Deskripsi |
| :--- | :--- | :--- |
| `org_slug` | `string` | Slug organisasi (contoh: `pussenif`, `mabes-ad`) |
| `id` | `uuid` | ID unik barang (`item.id`) |

---

## Response Body (Success 200 OK)

```json
{
  "id": "uuid-barang",
  "name": "Radio Alkomlek Type A",
  "type": "ASSET", // "ASSET" atau "CONSUMABLE"
  "equipmentType": "ALKOMLEK", // Opsional, hanya jika ASSET
  "baseUnit": "PCS",
  "description": "Keterangan detail barang...",
  "createdAt": "2024-03-29T10:00:00.000Z",
  
  "stocks": [
    {
      "id": "uuid-stock",
      "qty": "25.0000",
      "updatedAt": "2024-03-29T11:00:00.000Z",
      "warehouse": {
        "id": "uuid-gudang",
        "name": "Gudang Utama Pussenif",
        "location": "Bandung"
      }
    }
  ],
  
  "equipments": [
    {
      "id": "uuid-alat",
      "serialNumber": "SN-12345",
      "brand": "Harris",
      "condition": "BAIK",
      "status": "READY",
      "warehouse": {
        "name": "Gudang Alkom"
      }
    }
  ],
  
  "movements": [
    {
      "id": "uuid-movement",
      "eventType": "RECEIVE",
      "qty": "10.0000",
      "unit": "BOX",
      "createdAt": "2024-03-29T09:00:00.000Z",
      "fromWarehouse": null,
      "toWarehouse": { "name": "Gudang Utama" },
      "pic": {
        "id": "uuid-user",
        "name": "Sertu Budi"
      }
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
```

---

## Logic Details

1. **Filtering Otomatis**:
   - `stocks`: Hanya menampilkan stok dari gudang-gudang yang dimiliki oleh organisasi dalam `org_slug`.
   - `equipments`: Hanya menampilkan daftar alat yang terdaftar di bawah organisasi tersebut.
   - `movements`: Hanya menampilkan riwayat transaksi yang melibatkan organisasi tersebut (maksimal 5 riwayat terbaru).
2. **Decimal Handling**: Nilai `qty` dan `multiplier` dikembalikan dalam format `string` dengan presisi 4 desimal (standar database MySQL Decimal) untuk menghindari masalah pembulatan pada JavaScript.
3. **Relation Loading**: Menggunakan *eager loading* (Drizzle `with`) untuk meminimalkan jumlah *query* ke database.

---

## Error Responses

| Status Code | Kondisi | Pesan Error |
| :--- | :--- | :--- |
| `401 Unauthorized` | Pengguna belum login atau sesi berakhir. | `Unauthorized` |
| `404 Not Found` | Organisasi tidak ditemukan berdasarkan slug. | `Organization not found` |
| `404 Not Found` | Barang tidak ditemukan berdasarkan ID. | `Item tidak ditemukan` |
| `500 Internal Error`| Terjadi kegagalan server. | `Kesalahan server internal` |
