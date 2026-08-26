import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, username } from 'better-auth/plugins';

import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from '../../auth.roles';

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const allAuthRoles = {
	pimpinan,
	superadmin,
	kakomlek,
	operatorPusatDanDaerah,
	operatorBinmatDanBekharrah
};

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true },
	plugins: [username(), organization({ ac: accessControl, roles: allAuthRoles })]
});

// ─── Konfigurasi ──────────────────────────────────────────────────────────────
const CSV_DIR = path.resolve(__dirname, '../csv/merdeka');
const BATCH_SIZE = 100;
const ROOT_ORG_SLUG = 'merdeka'; // slug ISKDR MDA yang sudah dibuat di seed utama (index.ts)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readCsv<T = Record<string, string>>(filename: string): T[] {
	const filePath = path.join(CSV_DIR, filename);
	if (!fs.existsSync(filePath)) {
		throw new Error(`CSV tidak ditemukan: ${filePath}`);
	}
	const content = fs.readFileSync(filePath, 'utf-8');
	return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

async function batchInsert<T extends object>(
	label: string,
	rows: T[],
	inserter: (batch: T[]) => Promise<unknown>
) {
	if (rows.length === 0) {
		console.log(`  ⚠️  ${label}: tidak ada data, dilewati.`);
		return;
	}
	let inserted = 0;
	for (let i = 0; i < rows.length; i += BATCH_SIZE) {
		const batch = rows.slice(i, i + BATCH_SIZE);
		await inserter(batch);
		inserted += batch.length;
		process.stdout.write(`\r  ✦ ${label}: ${inserted}/${rows.length}`);
	}
	console.log(`\r  ✅ ${label}: ${inserted} baris berhasil diinsert`);
}

const slugify = (name: string) =>
	name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');

const validUnits = new Set([
	'PCS',
	'BOX',
	'METER',
	'LOT',
	'BUAH',
	'ROLL',
	'UNIT',
	'SET',
	'PAKET',
	'CABINET'
]);

const validConditions = new Set(['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'RUSAK_TOTAL']);

/**
 * Username better-auth hanya menerima alfanumerik + underscore, dengan batas panjang.
 * Nama satuan mengandung karakter seperti "/", ".", "'" dan bisa sangat panjang
 * (mis. "YONIF TP 916/BARA SAKTI"), jadi harus disanitasi + dipotong + dibuat unik.
 */
function toSafeUsername(prefix: string, rawName: string, maxLen = 30): string {
	const clean = rawName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	let base = `${prefix}.${clean}`;
	if (base.length > maxLen) {
		// Potong lalu tempel hash pendek dari nama asli supaya tetap unik meski terpotong.
		const hash = Buffer.from(rawName).toString('hex').slice(0, 6);
		base = `${base.slice(0, maxLen - 7)}_${hash}`;
	}
	return base;
}

// ─── Tipe CSV ─────────────────────────────────────────────────────────────────
interface SatuanRow {
	level: 'L0' | 'L1';
	name: string;
	slug: string;
	parentSlug: string;
}
interface CategoryRow {
	name: string;
}
interface ItemRow {
	id: string;
	name: string;
	type: 'ASSET' | 'CONSUMABLE';
	baseUnit: string;
	category: string;
	description: string;
	equipmentType: string;
	createdAt: string;
}
interface EquipmentRow {
	id: string;
	itemId: string;
	serialNumber: string;
	brand: string;
	condition: string;
	status: string;
	satuanSlug: string;
	location: string;
	createdAt: string;
}
interface MovementRow {
	id: string;
	itemId: string;
	equipmentId: string;
	eventType: string;
	qty: string;
	unit: string;
	classification: string;
	satuanSlug: string;
	location: string;
	notes: string;
	createdAt: string;
}

// ─── Step 1: Satuan Bawahan (Organization + Warehouse, parentId berjenjang) ───
/**
 * Struktur satuan hasil ekstraksi DATA_ISKANDAR_MUDA.xlsx (sheet NOMINATIF):
 *   ISKDR MDA (sudah ada, dari seed utama)
 *     └─ L0: satuan wilayah (mis. KOREM 131/SANTIAGO, BRIGIF-22/OTAMANASA, ...)
 *          └─ L1: satuan pemakai riil (mis. KODIM 1301/SGH, YONIF TP 915/BITU'O, ...)
 *
 * Setiap satuan (L0 & L1) dibuat sebagai organization dengan parentId berjenjang,
 * dan setiap satuan pemakai (L1) mendapat 1 warehouse sendiri — mengikuti pola
 * yang sama dengan seed/missing-satuan.ts & seed/index.ts.
 */
async function seedSatuan(): Promise<Map<string, { orgId: string; warehouseId: string }>> {
	console.log('\n🪖 Step 1: Membuat satuan bawahan Iskandar Muda...');
	const rows = readCsv<SatuanRow>('satuan.csv');

	const rootOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, ROOT_ORG_SLUG)
	});
	if (!rootOrg) {
		throw new Error(
			`Organisasi induk ISKDR MDA (slug: ${ROOT_ORG_SLUG}) belum ditemukan. Jalankan seed utama (seed/index.ts) terlebih dahulu.`
		);
	}

	const globalSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.username, 'global.superadmin')
	});
	if (!globalSuperadmin) {
		throw new Error('User global.superadmin belum ditemukan. Jalankan seed utama terlebih dahulu.');
	}

	// slug -> { orgId, warehouseId (jika ada) }
	const slugToOrg = new Map<string, { orgId: string; warehouseId: string }>();
	slugToOrg.set(ROOT_ORG_SLUG, { orgId: rootOrg.id, warehouseId: '' });

	// L0 dulu (parent = ISKDR MDA), baru L1 (parent = L0) — satuan.csv sudah terurut L0 lalu L1
	const l0Rows = rows.filter((r) => r.level === 'L0');
	const l1Rows = rows.filter((r) => r.level === 'L1');

	for (const batch of [l0Rows, l1Rows]) {
		for (const r of batch) {
			const existing = await db.query.organization.findFirst({
				where: eq(authSchema.organization.slug, r.slug)
			});

			let orgId: string;
			if (existing) {
				orgId = existing.id;
				console.log(`  ℹ️  Satuan "${r.name}" sudah ada, dilewati pembuatan org.`);
			} else {
				const parent = slugToOrg.get(r.parentSlug);
				if (!parent) {
					console.warn(
						`  ⚠️  Parent "${r.parentSlug}" belum tersedia untuk "${r.name}", dilewati.`
					);
					continue;
				}
				const created = await auth.api.createOrganization({
					body: { name: r.name, slug: r.slug, userId: globalSuperadmin.id }
				});
				if (!created) {
					console.warn(`  ⚠️  Gagal membuat organisasi: ${r.name}`);
					continue;
				}
				await db
					.update(authSchema.organization)
					.set({ parentId: parent.orgId })
					.where(eq(authSchema.organization.id, created.id));
				orgId = created.id;
				console.log(`  ✅ Satuan dibuat: ${r.name} (parent: ${r.parentSlug})`);
			}

			// Hanya satuan pemakai (L1) yang butuh warehouse fisik untuk equipment.
			let warehouseId = '';
			const existingWarehouse = await db.query.warehouse.findFirst({
				where: eq(schema.warehouse.organizationId, orgId)
			});
			if (existingWarehouse) {
				warehouseId = existingWarehouse.id;
			} else if (r.level === 'L1') {
				warehouseId = uuidv4();
				await db.insert(schema.warehouse).values({
					id: warehouseId,
					name: `Gudang Matbek ${r.name}`,
					location: `Markas ${r.name}`,
					organizationId: orgId
				});
			}

			slugToOrg.set(r.slug, { orgId, warehouseId });

			// Buat 1 user kakomlek per satuan pemakai (L1), sama seperti pola seed/index.ts
			if (r.level === 'L1' && !existing) {
				const roleName = 'kakomlek';
				const userUsername = toSafeUsername(roleName, r.name);
				const emailSlug = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
				const email = `${roleName}_${emailSlug}@gmail.com`;
				const displayName = `Kakomlek ${r.name}`;
				try {
					await auth.api.signUpEmail({
						body: {
							email,
							password: roleName,
							name: displayName,
							username: userUsername,
							displayUsername: displayName
						}
					});
					const userRec = await db.query.user.findFirst({
						where: eq(authSchema.user.username, userUsername)
					});
					if (userRec) {
						await auth.api.addMember({
							body: { organizationId: orgId, userId: userRec.id, role: roleName as any }
						});
					}
				} catch (e) {
					console.warn(`  ⚠️  Gagal membuat user untuk ${r.name}:`, (e as Error).message);
				}
			}
		}
	}

	console.log(`  📊 Total satuan siap dipakai: ${slugToOrg.size - 1} (di luar ISKDR MDA)`);
	return slugToOrg;
}

// ─── Step 2: Kategori Equipment (upsert, aware level, tidak menghapus data lama) ─
/**
 * Kategori diambil dari header level-2 sheet NOMINATIF (mis. ALKOM RDO,
 * PERANGKAT SERVER MILTRACK, ALKOM SALURAN, REPEATER, TOWER, dst).
 * Semua diperlakukan sebagai kategori level 1 (Utama, parentId null) —
 * idempotent seperti seed/categories.ts, aman dijalankan berkali-kali.
 */
async function upsertCategory(name: string, parentId: string | null, order: number) {
	const existing = await db.query.itemCategory.findFirst({
		where: parentId
			? and(eq(schema.itemCategory.name, name), eq(schema.itemCategory.parentId, parentId))
			: and(eq(schema.itemCategory.name, name), isNull(schema.itemCategory.parentId))
	});
	if (existing) return existing.id;

	const id = crypto.randomUUID();
	await db.insert(schema.itemCategory).values({ id, name, parentId, order });
	return id;
}

async function seedCategories(): Promise<Map<string, string>> {
	console.log('\n🗂️  Step 2: Import Kategori Equipment...');
	const rows = readCsv<CategoryRow>('categories.csv');

	const nameToId = new Map<string, string>();
	let order = 1;
	for (const r of rows) {
		const name = r.name.trim().toUpperCase();
		const id = await upsertCategory(name, null, order);
		nameToId.set(name, id);
		console.log(`  - Kategori: ${name}`);
		order++;
	}
	console.log(`  📊 Total kategori: ${nameToId.size}`);
	return nameToId;
}

// ─── Step 3: Items (Katalog Barang, dedup by name lintas satuan) ──────────────
async function seedItems(categoryNameToId: Map<string, string>): Promise<Map<string, string>> {
	console.log('\n📦 Step 3: Import Items (Katalog Barang)...');
	const rows = readCsv<ItemRow>('items.csv');

	const existingItems = await db.query.item.findMany({ columns: { name: true } });
	const existingNames = new Set(existingItems.map((i) => i.name));

	const toInsert = rows
		.filter((r) => !existingNames.has(r.name.trim()))
		.map((r) => ({
			id: r.id,
			name: r.name.trim(),
			type: 'ASSET' as const,
			baseUnit: (validUnits.has(r.baseUnit) ? r.baseUnit : 'UNIT') as
				| 'PCS'
				| 'BOX'
				| 'METER'
				| 'LOT'
				| 'BUAH'
				| 'ROLL'
				| 'UNIT'
				| 'SET'
				| 'PAKET'
				| 'CABINET',
			equipmentType: 'ALKOMLEK' as const,
			categoryId: categoryNameToId.get(r.category.trim().toUpperCase()) ?? null,
			description: r.description || null,
			imagePath: null,
			createdAt: new Date(r.createdAt)
		}));

	const skipped = rows.length - toInsert.length;
	console.log(
		`  📊 Total CSV: ${rows.length} | Akan diinsert: ${toInsert.length} | Skip (duplikat nama): ${skipped}`
	);

	await batchInsert('items', toInsert, (batch) =>
		db
			.insert(schema.item)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);

	// Map name -> id nyata di DB (termasuk item yang sudah ada sebelumnya)
	const allItems = await db.query.item.findMany({ columns: { id: true, name: true } });
	return new Map(allItems.map((i) => [i.name, i.id]));
}

// ─── Step 4: Equipment (Unit Fisik per Satuan, lengkap serial & lokasi) ───────
async function seedEquipment(
	itemNameToId: Map<string, string>,
	slugToOrg: Map<string, { orgId: string; warehouseId: string }>
): Promise<Set<string>> {
	console.log('\n🔧 Step 4: Import Equipment (Unit Fisik per Satuan)...');
	const rows = readCsv<EquipmentRow>('equipment.csv');
	const itemsCsv = readCsv<ItemRow>('items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	let skippedNoOrg = 0;
	let dedupedSerial = 0;

	// Ambil serial number yang sudah dipakai di DB (mis. dari satuan lain) supaya tidak
	// melanggar UNIQUE(serial_number) — pelanggaran unique key akan "diserap" oleh
	// onDuplicateKeyUpdate secara diam-diam (row baru gagal dibuat tanpa error), yang
	// akhirnya bikin insert movement berikutnya gagal FK constraint. Jadi kita cegah di sini.
	const existingSerials = new Set(
		(
			await db.query.equipment.findMany({
				columns: { serialNumber: true },
				where: (eq_, { isNotNull }) => isNotNull(eq_.serialNumber)
			})
		).map((e) => e.serialNumber as string)
	);
	const seenSerials = new Set<string>();

	const mapped = rows
		.map((r) => {
			const org = slugToOrg.get(r.satuanSlug);
			if (!org || !org.warehouseId) {
				skippedNoOrg++;
				return null;
			}
			const itemName = csvIdToName.get(r.itemId);
			const resolvedItemId = itemName ? itemNameToId.get(itemName) : undefined;
			if (!resolvedItemId) return null;

			let serialNumber: string | null =
				r.serialNumber && r.serialNumber.trim() !== '' ? r.serialNumber.trim() : null;
			if (serialNumber && (existingSerials.has(serialNumber) || seenSerials.has(serialNumber))) {
				dedupedSerial++;
				serialNumber = null; // simpan sebagai unit tanpa SN drpd gagal diam-diam
			} else if (serialNumber) {
				seenSerials.add(serialNumber);
			}

			return {
				id: r.id,
				itemId: resolvedItemId,
				serialNumber,
				brand: r.brand && r.brand.trim() !== '' ? r.brand.trim() : null,
				condition: (validConditions.has(r.condition) ? r.condition : 'BAIK') as
					| 'BAIK'
					| 'RUSAK_RINGAN'
					| 'RUSAK_BERAT'
					| 'RUSAK_TOTAL',
				status: 'READY' as const,
				warehouseId: org.warehouseId,
				organizationId: org.orgId,
				createdAt: new Date(r.createdAt)
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	console.log(
		`  📊 Total CSV: ${rows.length} | Akan diinsert: ${mapped.length} | Skip (satuan/item tidak ditemukan): ${skippedNoOrg} | Serial di-null-kan (duplikat): ${dedupedSerial}`
	);

	await batchInsert('equipment', mapped, (batch) =>
		db
			.insert(schema.equipment)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);

	// Verifikasi nyata: pastikan semua id yang kita klaim berhasil diinsert benar-benar ada di DB.
	const insertedIds = new Set(
		(
			await db.query.equipment.findMany({
				columns: { id: true },
				where: (eq_, { inArray: inArr }) =>
					inArr(
						eq_.id,
						mapped.map((m) => m.id)
					)
			})
		).map((e) => e.id)
	);
	const missing = mapped.filter((m) => !insertedIds.has(m.id));
	if (missing.length > 0) {
		console.warn(
			`  ⚠️  ${missing.length} equipment gagal ter-insert secara nyata (kemungkinan konflik unique key lain). ID ini akan dilewati saat seeding movement.`
		);
	}

	return new Set(insertedIds);
}

// ─── Step 5: Movement (Riwayat RECEIVE awal, lokasi spesifik per unit) ────────
async function seedMovements(
	itemNameToId: Map<string, string>,
	slugToOrg: Map<string, { orgId: string; warehouseId: string }>,
	insertedEquipmentIds: Set<string>
) {
	console.log('\n🚚 Step 5: Import Movement (Riwayat RECEIVE awal)...');
	const rows = readCsv<MovementRow>('movement_receive.csv');
	const itemsCsv = readCsv<ItemRow>('items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	let skippedNoEquipment = 0;
	const mapped = rows
		.map((r) => {
			const org = slugToOrg.get(r.satuanSlug);
			if (!org || !org.warehouseId) return null;
			const itemName = csvIdToName.get(r.itemId);
			const resolvedItemId = itemName ? itemNameToId.get(itemName) : undefined;
			if (!resolvedItemId) return null;
			// Jaga integritas FK: kalau equipment-nya gagal ter-insert (mis. konflik unique
			// key), jangan buat movement yang menunjuk ke equipment_id yang tidak ada.
			if (r.equipmentId && !insertedEquipmentIds.has(r.equipmentId)) {
				skippedNoEquipment++;
				return null;
			}

			return {
				id: r.id,
				itemId: resolvedItemId,
				equipmentId: r.equipmentId,
				eventType: 'RECEIVE' as const,
				qty: parseFloat(r.qty || '1').toFixed(4),
				unit: validUnits.has(r.unit) ? r.unit : 'UNIT',
				classification: 'KOMUNITY' as const,
				// Lokasi fisik spesifik alat (mis. "G. Komlekdam XIII/MDK", "Pos Kawaluso")
				// disimpan di sini karena tabel equipment tidak punya kolom lokasi teks.
				specificLocationName: r.location || null,
				fromWarehouseId: null,
				toWarehouseId: org.warehouseId,
				organizationId: org.orgId,
				notes: r.notes || null,
				picId: null,
				referenceType: null,
				referenceId: null,
				createdAt: new Date(r.createdAt)
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	await batchInsert('movement', mapped, (batch) =>
		db
			.insert(schema.movement)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

// ─── Cleanup: hanya data milik subtree Iskandar Muda ──────────────────────────
async function cleanupIskandarMuda(slugToOrg: Map<string, { orgId: string; warehouseId: string }>) {
	const orgIds = [...slugToOrg.values()].map((o) => o.orgId).filter(Boolean);
	if (orgIds.length === 0) return;

	console.log('\n🧹 Step 0: Membersihkan data equipment/movement Iskandar Muda lama...');
	await db.delete(schema.movement).where(inArray(schema.movement.organizationId, orgIds));
	await db.delete(schema.equipment).where(inArray(schema.equipment.organizationId, orgIds));
	console.log(
		'  ✅ Data lama berhasil dibersihkan (item & kategori tidak dihapus, hanya di-upsert).'
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
	console.log('════════════════════════════════════════════════════');
	console.log('  🪖  SEEDING DATA KESATUAN ISKANDAR MUDA');
	console.log('════════════════════════════════════════════════════');
	console.log(`  Database : ${process.env.DATABASE_URL?.split('@')[1] ?? '(tersembunyi)'}`);
	console.log(`  CSV Dir  : ${CSV_DIR}`);
	console.log(`  Batch    : ${BATCH_SIZE} rows/insert`);

	const required = [
		'satuan.csv',
		'categories.csv',
		'items.csv',
		'equipment.csv',
		'movement_receive.csv'
	];
	for (const f of required) {
		if (!fs.existsSync(path.join(CSV_DIR, f))) {
			throw new Error(`File CSV tidak ditemukan: ${path.join(CSV_DIR, f)}`);
		}
	}

	// 1) Satuan bawahan (buat jika belum ada, parentId berjenjang ke ISKDR MDA)
	const slugToOrg = await seedSatuan();

	// 0) Bersihkan data lama khusus subtree Iskandar Muda (aman untuk re-run)
	await cleanupIskandarMuda(slugToOrg);

	// 2) Kategori equipment (upsert, sadar level)
	const categoryNameToId = await seedCategories();

	// 3) Items (katalog barang, dedup by name)
	const itemNameToId = await seedItems(categoryNameToId);

	// 4) Equipment (unit fisik per satuan, lengkap serial & lokasi gudang)
	const insertedEquipmentIds = await seedEquipment(itemNameToId, slugToOrg);

	// 5) Movement RECEIVE awal (lokasi spesifik per unit dicatat di sini)
	await seedMovements(itemNameToId, slugToOrg, insertedEquipmentIds);

	console.log('\n════════════════════════════════════════════════════');
	console.log('  ✅  Seeding Iskandar Muda selesai!');
	console.log('════════════════════════════════════════════════════\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\n❌ Seeding gagal:', err);
	process.exit(1);
});
