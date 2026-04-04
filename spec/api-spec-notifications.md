# API Specification: Notifications

Dokumen ini menjelaskan spesifikasi API untuk pengelolaan notifikasi pada aplikasi Inventory Puskomlekad. Endpoint ini digunakan untuk mengambil, menandai sebagai terbaca, dan menghapus notifikasi baik untuk individu maupun organisasi.

## Dasar URL
`GET | PATCH | DELETE /api/notifications`

---

## 1. Ambil Notifikasi (GET)
Mengambil daftar notifikasi yang ditujukan kepada pengguna (userId) atau organisasi tempat pengguna bernaung (organizationId).

- **Endpoint:** `/api/notifications`
- **Method:** `GET`
- **Query Parameters:**
  - `limit` (number, optional): Membatasi jumlah notifikasi yang dikembalikan.

### Response (200 OK)
Mengembalikan array objek notifikasi.
```json
[
  {
    "id": "uuid",
    "userId": "uuid | null",
    "organizationId": "uuid | null",
    "title": "Judul Notifikasi",
    "body": "Isi pesan notifikasi",
    "priority": "LOW | MEDIUM | HIGH",
    "read": false,
    "action": "{\"type\": \"...\", \"resourceId\": \"...\"}",
    "createdAt": "ISO Date String"
  }
]
```

---

## 2. Tandai Terbaca (PATCH)
Mengubah status notifikasi menjadi sudah terbaca (`read: true`).

- **Endpoint:** `/api/notifications`
- **Method:** `PATCH`
- **Request Body:**
```json
{
  "id": "uuid"
}
```

### Response (200 OK)
```json
{
  "success": true
}
```

---

## 3. Hapus Notifikasi (DELETE)
Menghapus satu notifikasi spesifik atau membersihkan semua notifikasi.

- **Endpoint:** `/api/notifications`
- **Method:** `DELETE`
- **Request Body (Hapus Satu):**
```json
{
  "id": "uuid"
}
```

- **Request Body (Hapus Semua):**
```json
{
  "clearAll": true,
  "organizationId": "uuid | optional"
}
```
*Catatan: Jika `clearAll` true, server akan menghapus notifikasi milik user dan notifikasi milik organisasi user.*

### Response (200 OK)
```json
{
  "success": true
}
```

---

## Common Error Responses

- **400 Bad Request:** Data yang diperlukan (seperti `id`) tidak disertakan.
- **401 Unauthorized:** Pengguna belum login atau sesi tidak valid.
- **500 Internal Server Error:** Terjadi kesalahan pada server.
```json
{
  "error": "Error message description"
}
```
