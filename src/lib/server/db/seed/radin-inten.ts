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
const CSV_DIR = path.resolve(__dirname, '../csv/radin-inten');
const BATCH_SIZE = 100;
const ROOT_ORG_SLUG = 'raden-inten';

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

function toSafeUsername(prefix: string, rawName: string, maxLen = 30): string {
	const clean = rawName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	let base = `${prefix}.${clean}`;
	if (base.length > maxLen) {
		const hash = Buffer.from(rawName).toString('hex').slice(0, 6);
		base = `${base.slice(0, maxLen - 7)}_${hash}`;
	}
	return base;
}

// ─── Tipe CSV ─────────────────────────────────────────────────────────────────
interface SatuanRow {
	level: 'L0' | 'L1' | 'L2';
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

// ─── Step 0: Hapus data lama khusus Raden Inten ─────────────────────────────
async function cleanupRadenInten(rootOrgId: string) {
	console.log('\n🧹 Step 0: Membersihkan data Raden Inten lama...');

	// 1. Cari semua organisasi di bawah Raden Inten
	const allOrgs = await db.query.organization.findMany({
		columns: { id: true },
		where: inArray(schema.organization.parentId, [
			rootOrgId,
			...(
				await db.query.organization.findMany({
					columns: { id: true },
					where: eq(schema.organization.parentId, rootOrgId)
				})
			).map((o) => o.id)
		])
	});
	const orgIds = allOrgs.map((o) => o.id);
	orgIds.push(rootOrgId);

	// 2. Hapus movement, stock, equipment yang terkait
	if (orgIds.length > 0) {
		await db.delete(schema.movement).where(inArray(schema.movement.organizationId, orgIds));
		await db.delete(schema.stock).where(
			inArray(
				schema.stock.warehouseId,
				(
					await db.query.warehouse.findMany({
						columns: { id: true },
						where: inArray(schema.warehouse.organizationId, orgIds)
					})
				).map((w) => w.id)
			)
		);
		await db.delete(schema.equipment).where(inArray(schema.equipment.organizationId, orgIds));
	}

	// 3. Hapus warehouse satuan bawahan (opsional, bisa dibiarkan)
	// Kita tidak hapus warehouse karena akan dibuat ulang, tapi lebih aman dihapus
	const warehouseIds = (
		await db.query.warehouse.findMany({
			columns: { id: true },
			where: inArray(schema.warehouse.organizationId, orgIds)
		})
	).map((w) => w.id);
	if (warehouseIds.length > 0) {
		await db.delete(schema.warehouse).where(inArray(schema.warehouse.id, warehouseIds));
	}

	console.log('  ✅ Data lama berhasil dibersihkan (equipment, movement, stock, warehouse).');
}

// ─── Step 1: Satuan Bawahan ──────────────────────────────────────────────────
async function seedSatuan(
	rootOrgId: string
): Promise<Map<string, { orgId: string; warehouseId: string }>> {
	console.log('\n🪖 Step 1: Membuat satuan bawahan Raden Inten (BALAKDAM XXI/RI)...');
	const rows = readCsv<SatuanRow>('satuan.csv');

	const rootOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, ROOT_ORG_SLUG)
	});
	if (!rootOrg) {
		throw new Error(`Organisasi induk RADEN INTEN (slug: ${ROOT_ORG_SLUG}) belum ditemukan.`);
	}

	const globalSuperadmin = await db.query.user.findFirst({
		where: eq(authSchema.user.username, 'global.superadmin')
	});
	if (!globalSuperadmin) {
		throw new Error('User global.superadmin belum ditemukan.');
	}

	const slugToOrg = new Map<string, { orgId: string; warehouseId: string }>();
	slugToOrg.set(ROOT_ORG_SLUG, { orgId: rootOrg.id, warehouseId: '' });

	const l0Rows = rows.filter((r) => r.level === 'L0');
	const l1Rows = rows.filter((r) => r.level === 'L1');
	const l2Rows = rows.filter((r) => r.level === 'L2');

	for (const batch of [l0Rows, l1Rows, l2Rows]) {
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
				console.log(`  ✅ Satuan dibuat: ${r.name} (level ${r.level}, parent: ${r.parentSlug})`);
			}

			// Hanya L1 & L2 yang punya warehouse
			let warehouseId = '';
			if (r.level === 'L1' || r.level === 'L2') {
				const existingWarehouse = await db.query.warehouse.findFirst({
					where: eq(schema.warehouse.organizationId, orgId)
				});
				if (existingWarehouse) {
					warehouseId = existingWarehouse.id;
				} else {
					warehouseId = uuidv4();
					await db.insert(schema.warehouse).values({
						id: warehouseId,
						name: `Gudang Matbek ${r.name}`,
						location: `Markas ${r.name}`,
						organizationId: orgId
					});
				}
			}

			slugToOrg.set(r.slug, { orgId, warehouseId });

			// Buat user kakomlek untuk L1 & L2
			if ((r.level === 'L1' || r.level === 'L2') && !existing) {
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

	console.log(`  📊 Total satuan siap dipakai: ${slugToOrg.size - 1} (di luar RADEN INTEN)`);
	return slugToOrg;
}

// ─── Step 2: Kategori ─────────────────────────────────────────────────────────
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

// ─── Step 3: Items ────────────────────────────────────────────────────────────
async function seedItems(categoryNameToId: Map<string, string>): Promise<Map<string, string>> {
	console.log('\n📦 Step 3: Import Items (Katalog Barang)...');
	const rows = readCsv<ItemRow>('items.csv');

	const existingItems = await db.query.item.findMany({ columns: { name: true } });
	const existingNames = new Set(existingItems.map((i) => i.name));

	const seenInBatch = new Set<string>();
	const toInsert = rows
		.filter((r) => {
			const name = r.name.trim();
			if (existingNames.has(name) || seenInBatch.has(name)) return false;
			seenInBatch.add(name);
			return true;
		})
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

	const allItems = await db.query.item.findMany({ columns: { id: true, name: true } });
	return new Map(allItems.map((i) => [i.name, i.id]));
}

// ─── Step 4: Equipment ────────────────────────────────────────────────────────
async function seedEquipment(
	itemNameToId: Map<string, string>,
	slugToOrg: Map<string, { orgId: string; warehouseId: string }>,
	rootOrgId: string
): Promise<Set<string>> {
	console.log('\n🔧 Step 4: Import Equipment (Unit Fisik per Satuan)...');
	const rows = readCsv<EquipmentRow>('equipment.csv');
	const itemsCsv = readCsv<ItemRow>('items.csv');
	const csvIdToName = new Map(itemsCsv.map((r) => [r.id, r.name.trim()]));

	let skippedNoOrg = 0;
	let dedupedSerial = 0;

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
				serialNumber = null;
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
				organizationId: rootOrgId, // <- MILIK RADEN INTEN
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

	// Verifikasi inserted IDs
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

// ─── Step 5: Movement ─────────────────────────────────────────────────────────
async function seedMovements(
	itemNameToId: Map<string, string>,
	slugToOrg: Map<string, { orgId: string; warehouseId: string }>,
	insertedEquipmentIds: Set<string>,
	rootOrgId: string
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
				specificLocationName: r.location || null,
				fromWarehouseId: null,
				toWarehouseId: org.warehouseId,
				organizationId: rootOrgId, // <- MILIK RADEN INTEN
				notes: r.notes || null,
				picId: null,
				referenceType: null,
				referenceId: null,
				createdAt: new Date(r.createdAt)
			};
		})
		.filter((r): r is NonNullable<typeof r> => r !== null);

	if (skippedNoEquipment > 0) {
		console.log(
			`  ℹ️  ${skippedNoEquipment} movement dilewati (equipment terkait tidak ter-insert).`
		);
	}

	await batchInsert('movement', mapped, (batch) =>
		db
			.insert(schema.movement)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
	console.log('════════════════════════════════════════════════════');
	console.log('  🪖  SEEDING DATA KESATUAN RADEN INTEN (BALAKDAM XXI/RI)');
	console.log('  📄  Sumber: Bentuk_16_Komlekdm_XXI_RI_TW_II.xlsx');
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

	// Pastikan root org ada
	const rootOrg = await db.query.organization.findFirst({
		where: eq(authSchema.organization.slug, ROOT_ORG_SLUG)
	});
	if (!rootOrg) {
		throw new Error(`Organisasi induk RADEN INTEN (slug: ${ROOT_ORG_SLUG}) belum ditemukan.`);
	}
	const rootOrgId = rootOrg.id;

	// 0) Hapus data lama
	await cleanupRadenInten(rootOrgId);

	// 1) Satuan bawahan
	const slugToOrg = await seedSatuan(rootOrgId);

	// 2) Kategori
	const categoryNameToId = await seedCategories();

	// 3) Items
	const itemNameToId = await seedItems(categoryNameToId);

	// 4) Equipment (dengan organizationId = rootOrgId)
	const insertedEquipmentIds = await seedEquipment(itemNameToId, slugToOrg, rootOrgId);

	// 5) Movement (dengan organizationId = rootOrgId)
	await seedMovements(itemNameToId, slugToOrg, insertedEquipmentIds, rootOrgId);

	console.log('\n════════════════════════════════════════════════════');
	console.log('  ✅  Seeding Raden Inten selesai!');
	console.log('════════════════════════════════════════════════════\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\n❌ Seeding gagal:', err);
	process.exit(1);
});
