# SVELTEKIT_STANDARDS.md

## 1. Core Tech Stack

- **Framework:** SvelteKit 2.x
- **Compiler:** Svelte 5 (Stable)
- **Runtime:** Bun
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Database/ORM:** Drizzle ORM (MySQL/SQLite)

## 2. Reactivity (Svelte 5 Runes)

DILARANG menggunakan sintaks Svelte 4 (`let`, `$:`, `export let`). Selalu gunakan **Runes**:

- **State:** Gunakan `$state()` untuk variabel reaktif.
- **Derived:** Gunakan `$derived()` untuk nilai yang bergantung pada state lain.
- **Effect:** Gunakan `$effect()` untuk side-effects (gunakan seperlunya).
- **Props:** Gunakan `$props()` untuk menerima data dari parent.
  ```typescript
  // Contoh Svelte 5
  let { name = 'Guest', items = [] } = $props<{ name: string, items: any[] }>();
  let count = $state(0);
  let double = $derived(count * 2);
  ```

## 3. Logic Files (.svelte.ts)

- Pisahkan logika bisnis yang kompleks atau state yang bisa dibagi (_shared state_) ke dalam file `.svelte.ts` menggunakan class atau fungsi yang mengembalikan runes.
- Gunakan file ini untuk pengelolaan state global atau modular.

## 4. Routing & Data Loading

- **Directory-based Routing:** Gunakan struktur `src/routes/[route]/+page.svelte`.
- **Server Loading:** Gunakan `+page.server.ts` untuk operasi database dan API sensitive.
- **Form Actions:** Gunakan `export const actions` untuk mutasi data guna mendukung _progressive enhancement_.
- **Type Safety:** Selalu gunakan tipe data yang dihasilkan otomatis oleh SvelteKit:
  ```typescript
  import type { PageServerLoad, Actions } from './$types';
  ```

## 5. Database & Schema (Drizzle ORM)

- Definisikan schema di `src/lib/server/db/schema.ts`.
- Gunakan `db.query` untuk pembacaan data yang simpel dan `db.insert/update` untuk mutasi.
- Pastikan koneksi database bersifat singleton di `src/lib/server/db/index.ts`.

## 6. UI/UX & Styling Standards (Tailwind v4)

- **Components:** Wajib menggunakan **Shadcn-Svelte** (atau komponen berbasis **Bits UI**) untuk elemen kompleks guna memastikan perilaku ARIA yang benar secara default.
- **Tailwind v4 Syntax:** Gunakan standar penulisan baru untuk tailwind v4
- **Precision:** Gunakan variabel CSS untuk konsistensi. Hindari _hardcoded_ warna di luar palet Tailwind.
- **Loading States:** Gunakan file `+loading.svelte` dengan skeleton screen dari Shadcn untuk menjaga _Cumulative Layout Shift_ (CLS) tetap rendah.

## 7. Best Practices

- Gunakan `$inspect()` alih-alih `console.log()` untuk memantau perubahan state reaktif secara _real-time_.
- Manfaatkan `Snippet` di Svelte 5 untuk menggantikan slot yang sudah _deprecated_.
- Selalu validasi input menggunakan library seperti **Zod** sebelum memproses data di server.

## 8. Accessibility (A11y) Rules

Strictly follow WCAG 2.1 Level AA.

- **Interactive Elements:** Hindari penggunaan _event listener_ pada elemen statis seperti `div` atau `span`. Seiring dengan update Sveltekit/Svelte 5, gunakan sintaks modern `onclick` (menggantikan `on:click`) secara eksklusif pada elemen semantik. Gunakan `<button type="button">` untuk aksi di dalam aplikasi atau `<a>` untuk navigasi antar halaman agar tetap _accessible_.
- **Mandatory Attributes:** Jika terpaksa menggunakan elemen non-semantik, Anda WAJIB menyertakan `role`, `tabindex`, dan penanganan keyboard melalui `onkeydown`.
- **Form Labeling:** Setiap input WAJIB memiliki `<label>` yang tertaut secara eksplisit (menggunakan atribut `for` atau dengan membungkus input tersebut).
- **Focus Management:** Jangan pernah menghapus _outline_ bawaan (`outline: none`) tanpa menyediakan pengganti `focus-visible` yang jelas. Gunakan _action_ `use:enhance` untuk mengelola fokus secara otomatis setelah proses _form submission_.
