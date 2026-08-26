import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_PATH = path.resolve(__dirname, './backfill-item-category-unmatched.csv');

/**
 * Backfill item.categoryId untuk item ALKOMLEK/PERNIKA_LEK yang belum punya kategori.
 *
 * Strategi mengikuti pola yang SUDAH dipakai di data existing (202 item yang sudah
 * ter-assign secara manual sebelumnya):
 *   1. Kalau nama item cocok dengan nama SUBKATEGORI (leaf) tertentu (mis. model radio
 *      spesifik) -> assign ke leaf itu. Ini paling presisi, dipakai untuk laporan BTK-16
 *      yang mengelompokkan per subkategori.
 *   2. Kalau tidak ada leaf yang cocok tapi nama item jelas satu keluarga dengan sebuah
 *      kategori INDUK (mis. banyak varian HT/Repeater/Base Station yang modelnya tidak
 *      ada di daftar 54 leaf) -> assign ke kategori induk. Ini persis pola yang dipakai
 *      untuk 176 dari 202 item yang sudah ada di DB sebelum script ini dibuat.
 *   3. Kalau tidak cocok sama sekali (nama terlalu unik/ambigu, atau equipment jenis baru
 *      yang subkategorinya memang belum dibuat) -> JANGAN ditebak. Item ini akan tetap
 *      NULL dan dicatat di CSV report untuk direview manual / dibuatkan kategori baru.
 *
 * Aman dijalankan berkali-kali (idempotent): hanya menyentuh item yang category_id
 * masih NULL. Jalankan dengan --dry-run dulu untuk lihat preview tanpa menulis ke DB.
 */

// ─── Rule: leaf (subkategori) ──────────────────────────────────────────────────
// Dicek lebih dulu karena paling spesifik. Regex di-uppercase-match terhadap nama item.
const LEAF_RULES: { pattern: RegExp; category: string }[] = [
	{ pattern: /\bPRC[\s-]*77\b/, category: 'RDO PRC-77' },
	{ pattern: /\bPRC[\s-]*1077\b/, category: 'RDO PRC-1077' },
	{ pattern: /\bPRM[\s-]*4700/, category: 'RDO PRM-4700 A' },
	{ pattern: /\bTR[\s-]*2400/, category: 'RDO TR-2400 MK II' },
	{ pattern: /\bTRC[\s-]*340\b/, category: 'RDO TRC-340' },
	{ pattern: /YAESU\s*S[\s-]*600/, category: 'RDO YAESU S-600' },
	{ pattern: /CROSCOM|CROSSCOM/, category: 'RDO HT CROSCOM' },
	{ pattern: /\bTETRA\b/, category: 'HT TETRA' },
	{ pattern: /REPEATE?E?R.*MOTOROL/, category: 'REPEATER MOTOROLA' },
	{ pattern: /REPEATE?E?R.*ICOM/, category: 'REPEATER ICOM' },
	{ pattern: /XiR\s*M[\s-]*8268/i, category: 'BASE STATION XiR M8268' },
	{ pattern: /ICOM.*F[\s-]*6061|IC[\s-]*F6061/, category: 'BASE STATION ICOM IC F6061D' },
	{ pattern: /GM[\s-]*338/, category: 'BASE STATION MOTOROLLA GM-338' },
	{ pattern: /BMS.*POSKO|POSKO.*BMS/, category: 'BMS  POSKO' },
	{ pattern: /BMS.*PERSONEL/, category: 'BMS PERSONEL' },
	{ pattern: /BMS.*RANPUR/, category: 'BMS  RANPUR' },
	{ pattern: /VSAT.*MANPACK/, category: 'VSAT MANPACK' },
	{ pattern: /C[\s-]*BAND\s*MOBILE/, category: 'C-BAND MOBILE' },
	{ pattern: /SOTM|SATELIT ON THE MOVE/, category: 'SOTM (SATELIT ON THE MOVE)' },
	{ pattern: /JAMMER.*KENDARAAN/, category: 'JAMMER KENDARAAN' },
	{ pattern: /JAMMER.*TRANSPORTABLE/, category: 'JAMMER TRANSPORTABLE' },
	{ pattern: /AIR\s*PATROL/, category: 'AIR PATROL' },
	{ pattern: /BLACK\s*HORNET|NANO\s*UAV/, category: 'DRONE NANO UAV (BLACK HORNET)' },
	{ pattern: /KAPTRONIK/, category: 'SOUND SYSTEM KAPTRONIK' },
	{ pattern: /RAMSA/, category: 'SOUND SYSTEM RAMSA' },
	{ pattern: /SOUND\s*SYSTEM.*LAPANGAN|LAPANGAN.*SOUND/, category: 'SOUND SYSTEM LAPANGAN' },
	{ pattern: /VIDEOTRON.*INDOOR/, category: 'VIDEOTRONE INDOOR' },
	{ pattern: /VIDEOTRON.*OUTDOOR/, category: 'VIDEOTRONE OUTDOOR' },
	{ pattern: /TRO\s*500\s*MS/, category: 'TRO 500 MS' },
	{ pattern: /TRO\s*300\s*MS/, category: 'TRO 300 MS' },
	{ pattern: /PABX.*3300AX|3300AX/, category: 'TRO PABX 200 MS TYPE 3300AX' },
	{ pattern: /SX\s*200\s*MITEL/, category: 'TRO SX 200 MITEL' },
	{ pattern: /TELEPON.*SATELIT|TLP.*SATELIT/, category: 'TELEPON SATELIT' },
	{ pattern: /TLP\s*LAPANGAN|TELEPON\s*LAPANGAN|TELEPHONE\s*TEST/, category: 'TELEPON LAPANGAN' },
	{ pattern: /\bACCU\b|\bAKI\b/, category: 'ACCU' },
	{ pattern: /SOLAR\s*(CELL|PANEL|CHARGER)/, category: 'SOLAR PANEL' },
	{ pattern: /\bAVO\s*METER\b/, category: 'AVO METER' },
	{ pattern: /FREQUEN[SC]I?\s*COUNTER|FREKUENSI\s*COUNTER/, category: 'FREQUENSI COUNTER' },
	{ pattern: /TOWER.*TRIANGLE|TIANG\s*ANT.*TRIANGLE/, category: 'TOWER TRIANGEL' },
	{ pattern: /\bLAPTOP\b|NOTE\s*BOOK/, category: 'LAPTOP' },
	{ pattern: /\bKOMPUTER\b|PERSONAL\s*KOMP|\bPC\b/, category: 'KOMPUTER' },
	{ pattern: /STARLINK/, category: 'STARLINK' }
];

// ─── Rule: kategori induk (fallback ketika tidak ada leaf yang cocok) ──────────
const PARENT_RULES: { pattern: RegExp; category: string }[] = [
	{
		pattern: /\bHT\b|HANDHELD|HAND\s*HELD|HANDSET|HARNES{1,2}|PORTABLE\s*RADIO|GENGGAM/,
		category: 'RADIO HT UHF/FM'
	},
	{ pattern: /REPEATE?E?R/, category: 'REPATAER UHF/FHV' },
	{ pattern: /BASE\s*STAT|BASE\s*ANTEN/, category: 'BASE STATION UHF/VHF' },
	{ pattern: /\bBMS\b/, category: 'BMS' },
	{ pattern: /VSAT|SATELIT|KOMSAT|MODEM.*SAT|IBUC|ODU\s*RTN/, category: 'KOMSAT' },
	{
		pattern: /JAMMER|DRONE|\bUAV\b|ANTI\s*DRONE|GROUND\s*CONTROL\s*STATION|DJI|AUTEL|MAVIC|MATRICE/,
		category: 'PERNIKA'
	},
	{
		pattern: /MIXER|SOUND|SPEAKER|MICROPHONE|\bMIC\b|CONFERENCE|CONFRENS|AMPLIFIER|LOUDSPEAKER/,
		category: 'TATA SUARA'
	},
	{ pattern: /VIDEOTRON|VIDIO\s*CONFRENC|CAMERA|CCTV/, category: 'VIDEOTRONE' },
	{ pattern: /\bPABX\b|\bTRO\b|SENTRAL\s*TELEPHONE|IP\s*CONSOLE/, category: 'TRO/PABX' },
	{ pattern: /\bTLP\b|TELEPON|TELEPHONE/, category: 'TELEPON' },
	{ pattern: /\bMOBIL\b|KENDARAAN/, category: 'KENDARAAN KHUSUS' },
	{
		pattern:
			/BATER[AE]I|BATTERY|BATT\b|\bACCU\b|CHARGER|INVERTER|STAVOL|\bAVR\b|POWER\s*SUPPLY|POWER\s*STATION|POWER\s*BANK|SOLAR|GENERATOR/,
		category: 'SUMBER TENAGA'
	},
	{
		pattern:
			/ANTENA|ANTENNA|\bANT\.|\bANT\b|CABLE|KABEL|CONNECTOR|TOOLKIT|TOOL\s*KIT|TESTER|CAVITY\s*FILTER|SUPRESSOR|HUB\s*SWITCH/,
		category: 'ALAT BENGKEL'
	},
	{ pattern: /\bTOWER\b|TIANG\s*ANT/, category: 'TOWER' },
	{
		pattern: /LAPTOP|KOMPUTER|MONITOR|SCANNER|ROUTER|SWITCH\b|APLIKASI|SOFTWARE/,
		category: 'LAIN-LAIN'
	},
	{
		pattern:
			/RADIO|\bRDO\b|\bRIG\b|PRC[\s-]*\d|PRM[\s-]*\d|GM[\s-]*\d|GP[\s-]*\d|TRANSCEIVER|TRANCIEVER|\bDMR\b|RETRANS|MANPACK/,
		category: 'ALKOM RADIO'
	}
];

function matchCategory(name: string): { level: 'leaf' | 'parent'; category: string } | null {
	const upper = name.toUpperCase();
	for (const rule of LEAF_RULES) {
		if (rule.pattern.test(upper)) return { level: 'leaf', category: rule.category };
	}
	for (const rule of PARENT_RULES) {
		if (rule.pattern.test(upper)) return { level: 'parent', category: rule.category };
	}
	return null;
}

async function main() {
	console.log('════════════════════════════════════════════════════');
	console.log('  🗂️  BACKFILL item.categoryId (ALKOMLEK / PERNIKA_LEK)');
	console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (tidak menulis ke DB)' : 'LIVE (akan menulis ke DB)'}`);
	console.log('════════════════════════════════════════════════════');

	// Ambil seluruh kategori, pisahkan leaf (punya parent) vs kategori induk (parent null)
	const allCategories = await db.query.itemCategory.findMany();
	const leafByName = new Map(
		allCategories.filter((c) => c.parentId !== null).map((c) => [c.name.trim().toUpperCase(), c.id])
	);
	const parentByName = new Map(
		allCategories.filter((c) => c.parentId === null).map((c) => [c.name.trim().toUpperCase(), c.id])
	);

	// Hanya target item yang relevan dengan taksonomi ini: ALKOMLEK / PERNIKA_LEK, dan belum punya kategori.
	const targets = await db.query.item.findMany({
		where: and(
			isNull(schema.item.categoryId),
			inArray(schema.item.equipmentType, ['ALKOMLEK', 'PERNIKA_LEK'])
		)
	});

	console.log(`\n  📦 Item tanpa kategori (ALKOMLEK/PERNIKA_LEK): ${targets.length}`);

	const updates: { id: string; categoryId: string }[] = [];
	const unmatched: { id: string; name: string; equipmentType: string | null }[] = [];
	let leafCount = 0;
	let parentCount = 0;

	for (const it of targets) {
		const match = matchCategory(it.name);
		if (!match) {
			unmatched.push({ id: it.id, name: it.name, equipmentType: it.equipmentType });
			continue;
		}

		const key = match.category.trim().toUpperCase();
		const categoryId = match.level === 'leaf' ? leafByName.get(key) : parentByName.get(key);

		if (!categoryId) {
			// Rule menunjuk ke kategori yang ternyata belum ada di DB (nama typo / belum di-seed)
			unmatched.push({ id: it.id, name: it.name, equipmentType: it.equipmentType });
			continue;
		}

		updates.push({ id: it.id, categoryId });
		if (match.level === 'leaf') leafCount++;
		else parentCount++;
	}

	console.log(`  ✅ Cocok ke subkategori (leaf)  : ${leafCount}`);
	console.log(`  ✅ Cocok ke kategori induk (fallback): ${parentCount}`);
	console.log(`  ⚠️  Tidak cocok (perlu review manual): ${unmatched.length}`);

	if (!DRY_RUN && updates.length > 0) {
		console.log('\n💾 Menulis update ke DB...');
		const BATCH_SIZE = 100;
		let done = 0;
		for (let i = 0; i < updates.length; i += BATCH_SIZE) {
			const batch = updates.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map((u) =>
					db.update(schema.item).set({ categoryId: u.categoryId }).where(eq(schema.item.id, u.id))
				)
			);
			done += batch.length;
			process.stdout.write(`\r  ✦ ${done}/${updates.length}`);
		}
		console.log(`\r  ✅ ${done}/${updates.length} item ter-update`);
	} else if (DRY_RUN) {
		console.log(
			'\n  ℹ️  Dry run — tidak ada perubahan ditulis. Jalankan tanpa --dry-run untuk eksekusi.'
		);
	}

	// Tulis laporan item yang tidak cocok, supaya bisa direview manual / dibuatkan kategori baru
	if (unmatched.length > 0) {
		const header = 'id,equipmentType,name\n';
		const rows = unmatched
			.map((u) => `${u.id},${u.equipmentType ?? ''},"${u.name.replace(/"/g, '""')}"`)
			.join('\n');
		fs.writeFileSync(REPORT_PATH, header + rows, 'utf-8');
		console.log(`\n  📄 Daftar item tidak cocok ditulis ke: ${REPORT_PATH}`);
	}

	console.log('\n════════════════════════════════════════════════════');
	console.log('  ✅  Backfill selesai!');
	console.log('════════════════════════════════════════════════════\n');
	process.exit(0);
}

main().catch((err) => {
	console.error('\n❌ Backfill gagal:', err);
	process.exit(1);
});
