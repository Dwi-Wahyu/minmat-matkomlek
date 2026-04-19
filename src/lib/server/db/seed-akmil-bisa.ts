import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

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
} from '../auth.roles';

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
const CSV_DIR = path.resolve(__dirname, './csv');
const BATCH_SIZE = 100;

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

// ─── Tipe CSV ─────────────────────────────────────────────────────────────────
interface ItemRow {
	id: string;
	name: string;
	type: 'ASSET' | 'CONSUMABLE';
	baseUnit: string;
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
	createdAt: string;
}

interface StockRow {
	id: string;
	itemId: string;
	qty: string;
	unit: string;
}

interface MovementRow {
	id: string;
	itemId: string;
	equipmentId: string;
	eventType: string;
	qty: string;
	unit: string;
	classification: string;
	notes: string;
	createdAt: string;
}

// ─── Seeders ──────────────────────────────────────────────────────────────────
async function seedItems() {
	console.log('\n📦 Step 1: Import Items (Katalog Barang)...');
	const rows = readCsv<ItemRow>('akmil/items.csv');

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

	const mapped = rows.map((r) => ({
		id: r.id,
		name: r.name.trim(),
		type: r.type as 'ASSET' | 'CONSUMABLE',
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
		// equipmentType hanya relevan untuk ASSET, null untuk CONSUMABLE & ASSET non-komlek
		equipmentType:
			r.equipmentType === 'ALKOMLEK' || r.equipmentType === 'PERNIKA_LEK'
				? (r.equipmentType as 'ALKOMLEK' | 'PERNIKA_LEK')
				: null,
		description: r.description || null,
		imagePath: null,
		createdAt: new Date(r.createdAt)
	}));

	const assetCount = mapped.filter((m) => m.type === 'ASSET').length;
	const consumableCount = mapped.filter((m) => m.type === 'CONSUMABLE').length;
	const alkomlekCount = mapped.filter((m) => m.equipmentType === 'ALKOMLEK').length;
	const pernikaCount = mapped.filter((m) => m.equipmentType === 'PERNIKA_LEK').length;
	console.log(
		`  📊 Total: ${mapped.length} item (${assetCount} ASSET, ${consumableCount} CONSUMABLE)`
	);
	console.log(
		`     └─ ALKOMLEK: ${alkomlekCount} | PERNIKA_LEK: ${pernikaCount} | Non-komlek: ${assetCount - alkomlekCount - pernikaCount}`
	);

	await batchInsert('items', mapped, (batch) =>
		db
			.insert(schema.item)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

async function seedEquipment(orgId: string, warehouseId: string) {
	console.log('\n🔧 Step 2: Import Equipment (Unit Fisik ASSET)...');
	const rows = readCsv<EquipmentRow>('akmil/equipment.csv');

	const withSN = rows.filter(
		(r) => r.serialNumber && r.serialNumber.trim() !== '' && r.serialNumber !== 'nan'
	);
	const withoutSN = rows.filter(
		(r) => !r.serialNumber || r.serialNumber.trim() === '' || r.serialNumber === 'nan'
	);
	console.log(
		`  📊 Total: ${rows.length} unit (${withSN.length} ber-SN, ${withoutSN.length} tanpa SN)`
	);

	const mapped = rows.map((r) => ({
		id: r.id,
		itemId: r.itemId,
		serialNumber: r.serialNumber && r.serialNumber !== 'nan' ? r.serialNumber.trim() : null,
		brand: r.brand && r.brand !== 'nan' ? r.brand.trim() : null,
		condition: (r.condition as 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT') ?? 'BAIK',
		status: (r.status as 'READY' | 'IN_USE' | 'TRANSIT' | 'MAINTENANCE') ?? 'READY',
		// Ganti placeholder CSV dengan ID nyata dari DB yang sudah di-seed
		warehouseId: warehouseId,
		organizationId: orgId,
		createdAt: new Date(r.createdAt)
	}));

	await batchInsert('equipment', mapped, (batch) =>
		db
			.insert(schema.equipment)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

async function seedStock(orgId: string, warehouseId: string) {
	console.log('\n📊 Step 3: Import Stock (Stok CONSUMABLE)...');
	const rows = readCsv<StockRow>('akmil/stock.csv');

	const mapped = rows.map((r) => ({
		id: r.id,
		itemId: r.itemId,
		// Ganti placeholder CSV dengan ID nyata dari DB yang sudah di-seed
		warehouseId: warehouseId,
		qty: parseFloat(r.qty).toFixed(4)
	}));

	await batchInsert('stock', mapped, (batch) =>
		db
			.insert(schema.stock)
			.values(batch)
			.onDuplicateKeyUpdate({ set: { id: sql`id` } })
	);
}

async function seedMovements(orgId: string, warehouseId: string) {
	console.log('\n🚚 Step 4: Import Movement (Riwayat RECEIVE awal)...');
	const rows = readCsv<MovementRow>('akmil/movement_receive.csv');

	const validEventTypes = new Set([
		'RECEIVE',
		'ISSUE',
		'ADJUSTMENT',
		'TRANSFER_OUT',
		'TRANSFER_IN',
		'LOAN_OUT',
		'LOAN_RETURN',
		'DISTRIBUTE_OUT',
		'DISTRIBUTE_IN',
		'MAINTENANCE_IN',
		'MAINTENANCE_OUT'
	]);

	const validClassifications = new Set(['BALKIR', 'KOMUNITY', 'TRANSITO']);

	const mapped = rows.map((r) => ({
		id: r.id,
		itemId: r.itemId || null,
		equipmentId: r.equipmentId && r.equipmentId.trim() !== '' ? r.equipmentId : null,
		eventType: (validEventTypes.has(r.eventType) ? r.eventType : 'RECEIVE') as
			| 'RECEIVE'
			| 'ISSUE'
			| 'ADJUSTMENT'
			| 'TRANSFER_OUT'
			| 'TRANSFER_IN'
			| 'LOAN_OUT'
			| 'LOAN_RETURN'
			| 'DISTRIBUTE_OUT'
			| 'DISTRIBUTE_IN'
			| 'MAINTENANCE_IN'
			| 'MAINTENANCE_OUT',
		qty: parseFloat(r.qty).toFixed(4),
		unit: r.unit || null,
		classification: (validClassifications.has(r.classification) ? r.classification : 'KOMUNITY') as
			| 'BALKIR'
			| 'KOMUNITY'
			| 'TRANSITO',
		specificLocationName: 'Gudang Utama Akmil',
		fromWarehouseId: null,
		// Ganti placeholder CSV dengan ID nyata dari DB yang sudah di-seed
		toWarehouseId: warehouseId,
		organizationId: orgId,
		notes: r.notes || null,
		picId: null,
		referenceType: null,
		referenceId: null,
		createdAt: new Date(r.createdAt)
	}));

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
	console.log('  🪖  SEEDING DATA AKMIL - BTK-16 TW1 2026');
	console.log('════════════════════════════════════════════════════');
	console.log(`  Database : ${process.env.DATABASE_URL?.split('@')[1] ?? '(tersembunyi)'}`);
	console.log(`  CSV Dir  : ${CSV_DIR}`);
	console.log(`  Batch    : ${BATCH_SIZE} rows/insert`);

	// Validasi CSV tersedia
	const required = [
		'akmil/items.csv',
		'akmil/equipment.csv',
		'akmil/stock.csv',
		'akmil/movement_receive.csv'
	];
	for (const f of required) {
		if (!fs.existsSync(path.join(CSV_DIR, f))) {
			throw new Error(
				`File CSV tidak ditemukan: ${path.join(CSV_DIR, f)}\nLetakkan semua CSV di folder: ${CSV_DIR}`
			);
		}
	}

	// Ambil org & warehouse yang sudah di-seed dari seeding utama
	const existingOrg = await db.query.organization.findFirst({
		where: (org, { eq }) => eq(org.name, 'AKMIL')
	});

	if (!existingOrg) {
		console.log('  ⚠️  Organisasi AKMIL belum ditemukan. Jalankan seeding utama terlebih dahulu.');
		process.exit(1);
	}

	const existingWarehouse = await db.query.warehouse.findFirst({
		where: (warehouse, { eq }) => eq(warehouse.organizationId, existingOrg.id)
	});

	if (!existingWarehouse) {
		console.log(
			'  ⚠️  Gudang untuk organisasi AKMIL belum ditemukan. Jalankan seeding utama terlebih dahulu.'
		);
		process.exit(1);
	}

	console.log(`\n  🏢 Organisasi : ${existingOrg.name} (${existingOrg.id})`);
	console.log(`  🏭 Gudang     : ${existingWarehouse.name} (${existingWarehouse.id})`);

	// ─── Cleanup Data Existing (AKMIL Only) ───────────────────────────────────
	console.log('\n🧹 Step 0: Membersihkan data AKMIL lama...');
	// Hapus movement yang terkait dengan organizationId AKMIL
	await db.delete(schema.movement).where(sql`${schema.movement.organizationId} = ${existingOrg.id}`);
	// Hapus equipment yang terkait dengan organizationId AKMIL
	await db.delete(schema.equipment).where(sql`${schema.equipment.organizationId} = ${existingOrg.id}`);
	// Hapus stock yang terkait dengan warehouseId AKMIL
	await db.delete(schema.stock).where(sql`${schema.stock.warehouseId} = ${existingWarehouse.id}`);
	console.log('  ✅ Data lama berhasil dibersihkan.');

	// await seedOrganizationAndWarehouse();
	await seedItems();
	await seedEquipment(existingOrg.id, existingWarehouse.id);
	await seedStock(existingOrg.id, existingWarehouse.id);
	await seedMovements(existingOrg.id, existingWarehouse.id);

	console.log('\n════════════════════════════════════════════════════');
	console.log('  ✅  Seeding selesai!');
	console.log('════════════════════════════════════════════════════\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\n❌ Seeding gagal:', err);
	process.exit(1);
});
