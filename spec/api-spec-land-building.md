# API Specification: Land & Building

Endpoin API untuk mengelola data Tanah dan Bangunan. Semua endpoint di bawah ini memerlukan autentikasi.

## Base URL
`/api/{org_slug}`

---

## 1. Tanah (Land)

### GET /land
Mengambil daftar semua data tanah milik organisasi.

**Query Parameters:**
- `q` (optional): String pencarian untuk No. Sertifikat, Lokasi, atau Peruntukan.

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "certificateNumber": "HP.001/...",
    "location": "Alamat Lengkap",
    "area": "1500.00",
    "status": "MILIK_TNI",
    "usage": "Kantor",
    "latitude": "-6.123456",
    "longitude": "106.123456",
    "photoPath": "filename.jpg",
    "description": "Keterangan",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
]
```

### POST /land
Menambahkan data tanah baru. Menggunakan `multipart/form-data` untuk mendukung unggah foto.

**Request Body (form-data):**
- `certificateNumber` (required): string
- `location` (required): string
- `area` (required): number/string (decimal)
- `status` (required): "MILIK_TNI" | "SEWA"
- `usage` (required): string
- `description` (optional): string
- `latitude` (optional): string
- `longitude` (optional): string
- `image` (optional): file (image/png, image/jpeg)

**Response (201 Created):**
```json
{
  "id": "uuid",
  "certificateNumber": "...",
  ...
}
```

### GET /land/{id}
Mengambil detail data tanah berdasarkan ID.

**Response (200 OK):**
```json
{
  "id": "uuid",
  "certificateNumber": "...",
  "organization": { "id": "uuid", "name": "...", "slug": "..." },
  ...
}
```

### PATCH /land/{id}
Memperbarui data tanah. Menggunakan `multipart/form-data`.

**Request Body (form-data):**
- Field yang sama dengan POST (semua opsional).

**Response (200 OK):**
```json
{
  "id": "uuid",
  ...
}
```

### DELETE /land/{id}
Menghapus data tanah dan file foto terkait.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Land record deleted"
}
```

---

## 2. Bangunan (Building)

### GET /building
Mengambil daftar semua data bangunan milik organisasi.

**Query Parameters:**
- `q` (optional): String pencarian untuk Kode, Nama, atau Lokasi.

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "organizationId": "uuid",
    "code": "BGN-001",
    "name": "Gedung Utama",
    "location": "Alamat Lengkap",
    "type": "Kantor",
    "area": "500.00",
    "condition": "BAIK",
    "status": "MILIK_TNI",
    "latitude": "-6.123456",
    "longitude": "106.123456",
    "photoPath": "filename.jpg",
    "description": "Keterangan",
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
]
```

### POST /building
Menambahkan data bangunan baru. Menggunakan `multipart/form-data`.

**Request Body (form-data):**
- `code` (required): string
- `name` (required): string
- `location` (required): string
- `type` (required): string
- `area` (required): number/string (decimal)
- `condition` (required): "BAIK" | "RUSAK"
- `status` (required): "MILIK_TNI" | "SEWA"
- `description` (optional): string
- `latitude` (optional): string
- `longitude` (optional): string
- `image` (optional): file

**Response (201 Created):**
```json
{
  "id": "uuid",
  "code": "...",
  ...
}
```

### GET /building/{id}
Mengambil detail data bangunan berdasarkan ID.

### PATCH /building/{id}
Memperbarui data bangunan. Menggunakan `multipart/form-data`.

### DELETE /building/{id}
Menghapus data bangunan dan file foto terkait.

---

## Media Asset
Foto dapat diakses melalui URL:
- Tanah: `/uploads/land/{photoPath}`
- Bangunan: `/uploads/building/{photoPath}`
