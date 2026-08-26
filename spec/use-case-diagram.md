# Use Case Diagram - Sistem Inventaris Puskomlekad

Dokumen ini membagi Use Case Diagram ke dalam beberapa fitur utama agar lebih mudah dipahami.

---

## 1. Manajemen User

Fokus pada pengelolaan hak akses dan akun pengguna oleh administrator.

```mermaid
flowchart LR
    Admin["Superadmin"]

    subgraph "Manajemen User"
        UC_ManageUsers["Kelola Akun & Role"]
    end

    Admin --> UC_ManageUsers
```

---

## 2. Manajemen Inventaris

Fokus pada pengelolaan data alat, gudang, dan stok material.

```mermaid
flowchart LR
    Admin["Superadmin"]
    Boss["Pimpinan"]
    Kakomlek["Kakomlek"]
    OpCenter["Operator (Pusat/Daerah)"]
    OpSpecial["Operator (Binmat/Bekharrah)"]

    subgraph "Manajemen Inventaris"
        UC_ManageEquipment["Input & Edit Data Alat"]
        UC_ManageWarehouse["Manajemen Gudang"]
        UC_ImportData["Impor Data Excel"]
        UC_ViewInventory["Lihat Detail & Stok"]
    end

    Admin --> UC_ManageEquipment & UC_ManageWarehouse & UC_ImportData
    OpCenter --> UC_ManageEquipment & UC_ViewInventory
    Boss --> UC_ViewInventory
    Kakomlek --> UC_ViewInventory
    OpSpecial --> UC_ViewInventory
```

---

## 3. Operasional & Mutasi

Fokus pada alur kerja harian seperti peminjaman, pergerakan barang (mutasi), distribusi, dan pemeliharaan.

```mermaid
flowchart LR
    Boss["Pimpinan"]
    Kakomlek["Kakomlek"]
    OpCenter["Operator (Pusat/Daerah)"]
    OpSpecial["Operator (Binmat/Bekharrah)"]

    subgraph "Operasional & Mutasi"
        UC_Mutation["Pencatatan Mutasi"]
        UC_Lending["Pengajuan Peminjaman Alat"]
        UC_ApproveLending["Persetujuan Peminjaman"]
        UC_Distribution["Distribusi Barang"]
        UC_Maintenance["Pencatatan Pemeliharaan"]
        UC_ViewInventory["Lihat Detail & Stok"]
        UC_Notification["Monitoring Notifikasi"]
    end

    OpCenter --> UC_Mutation & UC_Lending & UC_Distribution & UC_ViewInventory
    OpSpecial --> UC_Maintenance & UC_Mutation & UC_ViewInventory
    Boss --> UC_ApproveLending & UC_ViewInventory
    Kakomlek --> UC_ApproveLending & UC_ViewInventory

    UC_Mutation -. include .-> UC_ViewInventory
    UC_Lending -. include .-> UC_Notification
    UC_ApproveLending -. include .-> UC_Notification
```

---

## 4. Laporan & Monitoring

Fokus pada transparansi data, audit log, dan pelaporan berkala.

```mermaid
flowchart LR
    Admin["Superadmin"]
    Boss["Pimpinan"]
    Kakomlek["Kakomlek"]
    OpSpecial["Operator (Binmat/Bekharrah)"]

    subgraph "Laporan & Monitoring"
        UC_Report["Generasi Laporan BTK-16"]
        UC_AuditLog["Monitoring Audit Log"]
        UC_Notification["Monitoring Notifikasi"]
    end

    Admin --> UC_AuditLog
    Boss --> UC_Report
    Kakomlek --> UC_Report
    OpSpecial --> UC_Report
```

---

### Daftar Aktor & Peran:

- **Superadmin**: Mengelola infrastruktur data (user, gudang, audit log).
- **Pimpinan / Kakomlek**: Melakukan pengawasan dan memberikan otorisasi (approval).
- **Operator (Pusat/Daerah)**: Pelaksana operasional inventaris dan logistik.
- **Operator (Binmat/Bekharrah)**: Pelaksana teknis pemeliharaan dan pelaporan materiil.
