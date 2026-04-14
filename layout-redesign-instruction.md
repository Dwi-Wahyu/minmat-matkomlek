# Design System Migration: Next.js → SvelteKit

## Instruksi Komprehensif untuk LLM

---

## 1. KONTEKS & TUJUAN

Kamu sedang memigrasikan sebuah aplikasi dari **Next.js** ke **SvelteKit**. Tugas utamamu adalah:

1. Menerapkan design system baru berbasis CSS variables (dari `layout.css` / `layout.css`)
2. Memastikan **dark mode adalah default**
3. Mengganti semua hardcoded color values dengan CSS variables yang tersedia
4. **Tidak mengubah fungsionalitas apapun** — hanya perubahan styling dan struktur file

---

## 2. SETUP: `layout.css` (Global Stylesheet)

Buat atau timpa file `src/layout.css` dengan konten berikut. File ini adalah **sumber kebenaran tunggal** untuk semua warna dan token desain.

```css
:root {
	--background: rgb(248, 250, 252);
	--foreground: rgb(30, 41, 59);
	--card: rgb(255, 255, 255);
	--card-foreground: rgb(30, 41, 59);
	--popover: rgb(255, 255, 255);
	--popover-foreground: rgb(30, 41, 59);
	--primary: rgb(56, 189, 248);
	--primary-foreground: rgb(255, 255, 255);
	--success: rgb(34, 197, 94);
	--success-foreground: rgb(255, 255, 255);
	--secondary: rgb(15, 23, 42);
	--secondary-foreground: rgb(255, 255, 255);
	--muted: rgb(243, 244, 246);
	--muted-foreground: rgb(107, 114, 128);
	--accent: rgb(224, 231, 255);
	--accent-foreground: rgb(55, 65, 81);
	--destructive: rgb(239, 68, 68);
	--destructive-foreground: rgb(255, 255, 255);
	--border: rgb(209, 213, 219);
	--input: rgb(209, 213, 219);
	--ring: rgb(99, 102, 241);
	--chart-1: rgb(99, 102, 241);
	--chart-2: rgb(79, 70, 229);
	--chart-3: rgb(67, 56, 202);
	--chart-4: rgb(55, 48, 163);
	--chart-5: rgb(49, 46, 129);
	--sidebar: rgb(243, 244, 246);
	--sidebar-foreground: rgb(30, 41, 59);
	--sidebar-primary: rgb(99, 102, 241);
	--sidebar-primary-foreground: rgb(255, 255, 255);
	--sidebar-accent: rgb(224, 231, 255);
	--sidebar-accent-foreground: rgb(55, 65, 81);
	--sidebar-border: rgb(209, 213, 219);
	--sidebar-ring: rgb(99, 102, 241);
	--font-sans: Inter, sans-serif;
	--font-serif: Merriweather, serif;
	--font-mono: JetBrains Mono, monospace;
	--radius: 0.5rem;
	--shadow-sm: 0px 4px 8px -1px hsl(0 0% 0% / 0.1), 0px 1px 2px -2px hsl(0 0% 0% / 0.1);
	--shadow: 0px 4px 8px -1px hsl(0 0% 0% / 0.1), 0px 1px 2px -2px hsl(0 0% 0% / 0.1);
	--shadow-md: 0px 4px 8px -1px hsl(0 0% 0% / 0.1), 0px 2px 4px -2px hsl(0 0% 0% / 0.1);
	--shadow-lg: 0px 4px 8px -1px hsl(0 0% 0% / 0.1), 0px 4px 6px -2px hsl(0 0% 0% / 0.1);
}

.dark {
	--background: rgb(15, 23, 42);
	--foreground: rgb(241, 245, 249);
	--card: rgb(26, 26, 46);
	--card-foreground: rgb(255, 255, 255);
	--popover: rgb(30, 41, 59);
	--popover-foreground: rgb(255, 255, 255);
	--primary: rgb(56, 189, 248);
	--primary-foreground: rgb(255, 255, 255);
	--success: rgb(34, 197, 94);
	--success-foreground: rgb(255, 255, 255);
	--secondary: rgb(255, 211, 42);
	--secondary-foreground: rgb(23, 43, 77);
	--muted: rgb(51, 65, 85);
	--muted-foreground: rgb(148, 163, 184);
	--accent: rgb(23, 43, 77);
	--accent-foreground: rgb(255, 255, 255);
	--destructive: rgb(220, 38, 38);
	--destructive-foreground: rgb(255, 255, 255);
	--border: rgb(51, 65, 85);
	--input: rgb(51, 65, 85);
	--ring: rgb(255, 255, 255);
	--chart-1: rgb(255, 211, 42);
	--chart-2: rgb(56, 189, 248);
	--chart-3: rgb(168, 85, 247);
	--chart-4: rgb(255, 255, 255);
	--chart-5: rgb(34, 211, 238);
	--sidebar: rgb(23, 43, 77);
	--sidebar-foreground: rgb(255, 255, 255);
	--sidebar-primary: rgb(255, 211, 42);
	--sidebar-primary-foreground: rgb(23, 43, 77);
	--sidebar-accent: rgb(48, 48, 96);
	--sidebar-accent-foreground: rgb(255, 255, 255);
	--sidebar-border: rgb(30, 41, 59);
	--sidebar-ring: rgb(255, 211, 42);
	--font-sans: Inter, sans-serif;
	--font-serif: Georgia, serif;
	--font-mono: JetBrains Mono, monospace;
	--radius: 0.5rem;
	--shadow-sm: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
	--shadow: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 1px 2px -1px hsl(240 30% 25% / 0.12);
	--shadow-md: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 2px 4px -1px hsl(240 30% 25% / 0.12);
	--shadow-lg: 0px 4px 10px 0px hsl(240 30% 25% / 0.12), 0px 4px 6px -1px hsl(240 30% 25% / 0.12);
}

/* Base reset */
* {
	border-color: var(--border);
}

body {
	background-color: var(--background);
	color: var(--foreground);
	font-family: var(--font-sans);
}
```

---

## 3. DEFAULT DARK MODE

### Cara Kerja

Dark mode diaktifkan dengan menambahkan class `dark` ke elemen `<html>`. Karena kita ingin dark mode sebagai **default**, kita perlu menambahkan class ini secara server-side agar tidak terjadi flash of light content (FOLC).

---

## 4. REFERENSI CSS VARIABLES LENGKAP

Gunakan tabel ini sebagai referensi ketika mengganti hardcoded values. **Jangan pernah gunakan hex/rgb langsung** — selalu gunakan variable.

### Warna Utama

| Variable                    | Kegunaan                    |
| --------------------------- | --------------------------- |
| `var(--background)`         | Background halaman utama    |
| `var(--foreground)`         | Teks utama                  |
| `var(--card)`               | Background card/panel       |
| `var(--card-foreground)`    | Teks di dalam card          |
| `var(--popover)`            | Background dropdown/tooltip |
| `var(--popover-foreground)` | Teks dropdown/tooltip       |

### Warna Aksi

| Variable                        | Kegunaan                       |
| ------------------------------- | ------------------------------ |
| `var(--primary)`                | Warna aksi utama (biru langit) |
| `var(--primary-foreground)`     | Teks di atas primary           |
| `var(--secondary)`              | Warna aksi sekunder            |
| `var(--secondary-foreground)`   | Teks di atas secondary         |
| `var(--destructive)`            | Warna bahaya/hapus             |
| `var(--destructive-foreground)` | Teks di atas destructive       |
| `var(--success)`                | Warna sukses                   |
| `var(--success-foreground)`     | Teks di atas success           |

### Warna Pendukung

| Variable                   | Kegunaan                         |
| -------------------------- | -------------------------------- |
| `var(--muted)`             | Background elemen redup/disabled |
| `var(--muted-foreground)`  | Teks placeholder/hint            |
| `var(--accent)`            | Background highlight ringan      |
| `var(--accent-foreground)` | Teks di atas accent              |
| `var(--border)`            | Warna border/divider             |
| `var(--input)`             | Border input field               |
| `var(--ring)`              | Focus ring/outline               |

### Warna Sidebar

| Variable                            | Kegunaan                |
| ----------------------------------- | ----------------------- |
| `var(--sidebar)`                    | Background sidebar      |
| `var(--sidebar-foreground)`         | Teks sidebar            |
| `var(--sidebar-primary)`            | Item aktif sidebar      |
| `var(--sidebar-primary-foreground)` | Teks item aktif sidebar |
| `var(--sidebar-accent)`             | Item hover sidebar      |
| `var(--sidebar-accent-foreground)`  | Teks item hover sidebar |
| `var(--sidebar-border)`             | Border sidebar          |
| `var(--sidebar-ring)`               | Focus ring sidebar      |

### Warna Chart

| Variable         | Kegunaan      |
| ---------------- | ------------- |
| `var(--chart-1)` | Data series 1 |
| `var(--chart-2)` | Data series 2 |
| `var(--chart-3)` | Data series 3 |
| `var(--chart-4)` | Data series 4 |
| `var(--chart-5)` | Data series 5 |

### Tipografi & Layout

| Variable            | Kegunaan                     |
| ------------------- | ---------------------------- |
| `var(--font-sans)`  | Font body/UI                 |
| `var(--font-serif)` | Font konten/artikel          |
| `var(--font-mono)`  | Font kode                    |
| `var(--radius)`     | Border radius dasar (0.5rem) |

### Shadow

| Variable           | Kegunaan       |
| ------------------ | -------------- |
| `var(--shadow-sm)` | Shadow ringan  |
| `var(--shadow)`    | Shadow standar |
| `var(--shadow-md)` | Shadow medium  |
| `var(--shadow-lg)` | Shadow besar   |

---

## 5. AUDIT HALAMAN: GANTI HARDCODED COLORS

### Cara Melakukan Audit

Untuk **setiap file** di `src/routes/` dan `src/lib/components/`, jalankan pencarian berikut:

**Pola yang harus diganti:**

```
# Hex colors
#[0-9a-fA-F]{3,6}

# RGB/RGBA
rgb\(
rgba\(

# Tailwind hardcoded (jika tidak menggunakan CSS variable)
bg-white
bg-gray-*
bg-slate-*
text-black
text-white (kecuali sudah sesuai)
border-gray-*
```

### Contoh Penggantian Konkret

**SEBELUM (hardcoded):**

```svelte
<div class="rounded-lg border border-gray-200 bg-white text-black shadow">
	<p class="text-gray-500">Subtitle</p>
	<button class="bg-blue-500 text-white">Submit</button>
</div>
```

**SESUDAH (pakai variable):**

```svelte
<div class="rounded-lg border border-border bg-card text-card-foreground shadow">
	<p class="text-muted-foreground">Subtitle</p>
	<button class="bg-primary text-primary-foreground">Submit</button>
</div>
```

---

## 6. STRUKTUR FILE SVELTEKIT

### Konversi dari Next.js

| Next.js               | SvelteKit                        |
| --------------------- | -------------------------------- |
| `app/layout.tsx`      | `src/routes/+layout.svelte`      |
| `app/page.tsx`        | `src/routes/+page.svelte`        |
| `app/[slug]/page.tsx` | `src/routes/[slug]/+page.svelte` |
| `app/api/route.ts`    | `src/routes/api/+server.ts`      |
| `components/`         | `src/lib/components/`            |
| `lib/`                | `src/lib/`                       |
| `public/`             | `static/`                        |
| `app/globals.css`     | `src/layout.css`                 |

### `src/routes/+layout.svelte` (Template Dasar)

```svelte
<script lang="ts">
	import '../layout.css';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<slot />
<!-- atau dengan Svelte 5: -->
{@render children()}
```

## 7. CHECKLIST AUDIT PER HALAMAN

Untuk setiap halaman/komponen, periksa item berikut:

### ✅ Warna Background

- [ ] Tidak ada `bg-white` → ganti dengan `bg-background` atau `bg-card`
- [ ] Tidak ada `bg-black` → ganti dengan `bg-secondary`
- [ ] Tidak ada `bg-gray-*` → ganti dengan `bg-muted` atau `bg-accent`
- [ ] Tidak ada `bg-slate-*` → ganti dengan variable yang sesuai
- [ ] Tidak ada hex/rgb langsung di `style=""`

### ✅ Warna Teks

- [ ] Tidak ada `text-black` → ganti dengan `text-foreground`
- [ ] Tidak ada `text-white` (kecuali di atas elemen berwarna) → cek konteks
- [ ] Tidak ada `text-gray-*` → ganti dengan `text-muted-foreground`
- [ ] Tidak ada `text-slate-*` → ganti dengan variable yang sesuai

### ✅ Border & Outline

- [ ] Tidak ada `border-gray-*` → ganti dengan `border-border`
- [ ] Tidak ada `border-slate-*` → ganti dengan `border-border`
- [ ] Tidak ada `outline-*` hardcoded → ganti dengan `ring-ring`

### ✅ Shadow

- [ ] Tidak ada `shadow-[...]` dengan hex → ganti dengan `shadow`, `shadow-sm`, dll.

### ✅ Dark Mode

- [ ] Tidak ada `dark:bg-*` hardcoded → semua sudah ditangani CSS variable
- [ ] Tidak ada `dark:text-*` hardcoded → semua sudah ditangani CSS variable

---

## 8. UTILITAS `cn()`

Buat file `src/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 9. ATURAN PENTING YANG TIDAK BOLEH DILANGGAR

1. **JANGAN mengubah logika bisnis** — hanya ubah class CSS dan struktur styling
2. **JANGAN menggunakan `dark:` prefix** di kelas Tailwind — semua dark mode ditangani oleh CSS variables yang otomatis berubah saat class `dark` ada di `<html>`
3. **JANGAN hardcode warna** dalam bentuk hex `#fff`, `rgb()`, atau nama warna langsung seperti `white`, `black`
4. **JANGAN menggunakan `!important`** — jika ada konflik, selesaikan melalui spesifisitas CSS
5. **SELALU gunakan CSS variable** dari daftar yang sudah tersedia di `layout.css`
6. **Jika warna tidak ada** di daftar variable, tambahkan ke `layout.css` di bagian `:root` dan `.dark` sebelum menggunakannya

---

## 11. URUTAN PENGERJAAN YANG DISARANKAN

1. **Setup** — Buat `src/layout.css` dengan semua tokens, update `src/app.html` dengan `class="dark"`
1. **Ubah Warna Sidebar** — Modifikasi warna `src/lib/components/Sidebar.svelte`
1. **Komponen shared** — Migrasi komponen di `src/lib/components/` dari yang paling sering dipakai
1. **Halaman per halaman** — Dari halaman yang paling sederhana ke yang paling kompleks
1. **Audit final** — Jalankan pencarian global untuk memastikan tidak ada hardcoded color yang tersisa

---

## 12. CARA VERIFIKASI

Setelah migrasi selesai, lakukan verifikasi berikut:

```bash
# Cari semua kemungkinan hardcoded color yang tersisa
grep -r "bg-white\|bg-black\|bg-gray-\|bg-slate-\|text-black\|text-white\|#[0-9a-fA-F]\{3,6\}\|rgb(" src/
```

Jika hasilnya kosong (atau hanya dari file yang memang boleh), migrasi berhasil.

Untuk memverifikasi dark mode bekerja: buka DevTools, di elemen `<html>` hapus class `dark` — tampilan harus berubah ke light mode. Tambahkan kembali — harus kembali ke dark mode.
