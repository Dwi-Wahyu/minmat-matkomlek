import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema, mode: 'default' });

import { organization } from 'better-auth/plugins';

import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from '../auth.roles';
import { eq } from 'drizzle-orm';

export const auth = betterAuth({
	baseURL: process.env.ORIGIN,
	secret: process.env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: { enabled: true },
	plugins: [
		organization({
			ac: accessControl,
			roles: {
				pimpinan,
				superadmin,
				kakomlek,
				operatorPusatDanDaerah,
				operatorBinmatDanBekharrah
			}
		})
	]
});

async function main() {
	console.log('Sedang melakukan seeding...');

	// Hapus data lama untuk menghindari duplikasi (Urutan penting karena Foreign Key)
	await db.delete(schema.warehouse);
	await db.delete(schema.lending);
	await db.delete(schema.maintenance);
	await db.delete(schema.organization);
	await db.delete(schema.equipment);
	await db.delete(schema.user);

	const adminResponse = await auth.api.signUpEmail({
		body: {
			email: 'admin@gmail.com',
			password: 'password123',
			name: 'Admin User'
		}
	});

	const kapuskomlekadResponse = await auth.api.signUpEmail({
		body: {
			email: 'kapus@gmail.com',
			password: 'password123',
			name: 'Kapuskomlekad'
		}
	});

	const adminId = adminResponse.user.id;

	// Buat Organisasi Induk: PUSKOMLEKAD
	const puskomlekad = await auth.api.createOrganization({
		body: {
			name: 'PUSKOMLEKAD',
			slug: 'puskomlekad',
			userId: adminResponse.user.id
		}
	});

	if (!puskomlekad) return;

	await auth.api.addMember({
		body: {
			organizationId: puskomlekad.id,
			userId: kapuskomlekadResponse.user.id,
			role: 'pimpinan'
		}
	});

	// Daftar 24 Satuan Wilayah dari gambar
	const daftarSatuan = [
		'ISKDR MDA',
		'BUKIT BRSN',
		'SRIWIJAYA',
		'SILIWANGI',
		'DIPENOGORO',
		'BRAWIJAYA',
		'MULAWARMN',
		'UDAYANA',
		'TANJUNG PR',
		'MERDRKA',
		'HASANUDDIN',
		'PATTIMURA',
		'CENDRAWASIH',
		'KASUARI',
		'TUANGKU TMBSI',
		'TUANGKU IB',
		'RADEN INTEN',
		'TAMBUN BUNGAI',
		'PALAKA WIRA',
		'MANDALA TRIKORA',
		'KOPASSUS',
		'KOSTRAD',
		'AKMIL'
	];

	if (!puskomlekad) {
		return;
	}

	// Seeding Satuan Wilayah
	for (const namaSatuan of daftarSatuan) {
		const slug = namaSatuan.toLowerCase().replace(/\s+/g, '-');

		// Buat Organisasi Wilayah
		const orgWilayah = await auth.api.createOrganization({
			body: {
				name: namaSatuan,
				slug: slug,
				userId: adminId // Sementara menggunakan admin pusat sebagai owner
			}
		});

		if (!orgWilayah) {
			continue;
		}

		// Update parentId ke PUSKOMLEKAD agar menjadi hierarki 1 induk
		await db
			.update(schema.organization)
			.set({ parentId: puskomlekad.id })
			.where(eq(schema.organization.id, orgWilayah.id));

		// Buat 1 Warehouse default untuk setiap satuan
		await db.insert(schema.warehouse).values({
			id: uuidv4(),
			name: `Gudang Matbek ${namaSatuan}`,
			location: `Markas ${namaSatuan}`,
			organizationId: orgWilayah.id
		});

		console.log(`─── Satuan ${namaSatuan} berhasil disinkronkan.`);
	}

	const adminHasanuddin = await auth.api.signUpEmail({
		body: {
			email: 'adminhasanuddin@gmail.com',
			password: 'password123',
			name: 'Admin Hasanuddin User'
		}
	});

	const kakomlekHasanuddin = await auth.api.signUpEmail({
		body: {
			email: 'kakomlekhasanuddin@gmail.com',
			password: 'password123',
			name: 'Kakomlek Hasanuddin User'
		}
	});

	const hasanuddinOrg = await db.query.organization.findFirst({
		where({ name }, { eq }) {
			return eq(name, 'HASANUDDIN');
		}
	});

	if (!hasanuddinOrg) {
		return;
	}

	await auth.api.addMember({
		body: {
			organizationId: hasanuddinOrg.id,
			userId: adminHasanuddin.user.id,
			role: 'operatorPusatDanDaerah'
		}
	});

	await auth.api.addMember({
		body: {
			organizationId: hasanuddinOrg.id,
			userId: kakomlekHasanuddin.user.id,
			role: 'kakomlek'
		}
	});

	// Seed Warehouse
	const warehouseId = uuidv4();
	await db.insert(schema.warehouse).values({
		id: warehouseId,
		name: 'Gudang Pusat Makassar',
		location: 'Jl. Hasanuddin No. 14, Makassar',
		createdAt: new Date(),
		organizationId: hasanuddinOrg.id
	});

	// Seed Item
	const itemId = uuidv4();
	await db.insert(schema.item).values({
		id: itemId,
		baseUnit: 'UNIT',
		name: 'Radio HF IC-718',
		type: 'ASSET'
	});

	// Seed Equipment
	const equipmentId = uuidv4();
	await db.insert(schema.equipment).values({
		id: equipmentId,
		itemId,
		name: 'Radio HF IC-718',
		serialNumber: 'SN-HF-2024-001',
		brand: 'Icom',
		type: 'ALKOMLEK',
		warehouseId: warehouseId,
		category: 'Radio Komunikasi',
		condition: 'BAIK',
		createdAt: new Date()
	});

	// Seed Maintenance
	await db.insert(schema.maintenance).values({
		id: uuidv4(),
		equipmentId: equipmentId,
		maintenanceType: 'PERAWATAN',
		description: 'Pengecekan rutin antena dan daya pancar.',
		scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 hari kedepan
		status: 'PENDING',
		technicianId: adminId,
		createdAt: new Date()
	});

	// Seed Lending
	const lendingId = uuidv4();
	await db.insert(schema.lending).values({
		id: lendingId,
		startDate: new Date(Date.now()),
		purpose: 'LATIHAN',
		unit: 'Hubdam XIV/Hasanuddin',
		endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 hari kedepan
		status: 'DRAFT',
		createdAt: new Date()
	});

	// Seed Lending Item
	const lendingItemId = uuidv4();
	await db.insert(schema.lendingItem).values({
		id: lendingItemId,
		equipmentId,
		lendingId
	});

	console.log('Seeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
