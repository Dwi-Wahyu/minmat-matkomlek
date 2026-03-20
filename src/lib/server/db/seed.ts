import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema'; // Import auth schema as well
import { drizzle } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';

import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' }); // Use both schemas

import { organization } from 'better-auth/plugins';

import {
	accessControl, // Import accessControl to get role names
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from '../auth.roles';
import { eq } from 'drizzle-orm';

// Define the roles object once to easily get its keys
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
	plugins: [
		organization({
			ac: accessControl,
			roles: allAuthRoles // Use the defined object
		})
	]
});

async function main() {
	console.log('Sedang melakukan seeding...');

	console.log('Menghapus data lama...');
	// Hapus data lama untuk menghindari duplikasi (Urutan penting karena Foreign Key)
	// Delete from child tables first, then parent tables
	await db.delete(schema.approval);
	await db.delete(schema.lendingItem);
	await db.delete(schema.lending);
	await db.delete(schema.maintenance);
	await db.delete(schema.distributionItem);
	await db.delete(schema.distribution);
	await db.delete(schema.movement);
	await db.delete(schema.stock);
	await db.delete(schema.equipment);
	await db.delete(schema.itemUnitConversion);
	await db.delete(schema.item);
	await db.delete(schema.warehouse);
	await db.delete(authSchema.member);
	await db.delete(authSchema.session);
	await db.delete(authSchema.apiKey);
	await db.delete(authSchema.account);
	await db.delete(authSchema.user);
	await db.delete(authSchema.organization);
	console.log('Data lama berhasil dihapus.');

	// --- Global Superadmin User ---
	const globalSuperadminResponse = await auth.api.signUpEmail({
		body: {
			email: 'global.superadmin@gmail.com',
			password: 'password123',
			name: 'Global Superadmin'
		}
	});
	const globalSuperadminId = globalSuperadminResponse.user.id;

	// --- PUSKOMLEKAD Organization ---
	const puskomlekadOrg = await auth.api.createOrganization({
		body: {
			name: 'PUSKOMLEKAD',
			slug: 'puskomlekad',
			userId: globalSuperadminId
		}
	});

	if (!puskomlekadOrg) {
		console.error('Failed to create PUSKOMLEKAD organization. Seeding stopped.');
		process.exit(1);
	}
	console.log(`Created organization: ${puskomlekadOrg.name}`);

	// Create a warehouse for PUSKOMLEKAD
	const puskomlekadWarehouseId = uuidv4();
	await db.insert(schema.warehouse).values({
		id: puskomlekadWarehouseId,
		name: `Gudang Matbek PUSKOMLEKAD`,
		location: `Markas PUSKOMLEKAD`,
		organizationId: puskomlekadOrg.id
	});
	console.log(`Created warehouse: Gudang Matbek PUSKOMLEKAD`);


	const allOrganizations = [];
	allOrganizations.push({ ...puskomlekadOrg, warehouseId: puskomlekadWarehouseId });

	// --- Daftar Satuan Wilayah ---
	const daftarSatuan = [
		'ISKDR MDA', 'BUKIT BRSN', 'SRIWIJAYA', 'SILIWANGI', 'DIPENOGORO', 'BRAWIJAYA',
		'MULAWARMN', 'UDAYANA', 'TANJUNG PR', 'MERDRKA', 'HASANUDDIN', 'PATTIMURA',
		'CENDRAWASIH', 'KASUARI', 'TUANGKU TMBSI', 'TUANGKU IB', 'RADEN INTEN',
		'TAMBUN BUNGAI', 'PALAKA WIRA', 'MANDALA TRIKORA', 'KOPASSUS', 'KOSTRAD', 'AKMIL'
	];

	// --- Seeding Satuan Wilayah ---
	for (const namaSatuan of daftarSatuan) {
		const slug = namaSatuan.toLowerCase().replace(/\s+/g, '-');

		const orgWilayah = await auth.api.createOrganization({
			body: {
				name: namaSatuan,
				slug: slug,
				userId: globalSuperadminId // Superadmin pusat sebagai owner sementara
			}
		});

		if (!orgWilayah) {
			console.warn(`Failed to create organization: ${namaSatuan}. Skipping.`);
			continue;
		}
		console.log(`Created organization: ${orgWilayah.name}`);


		await db
			.update(authSchema.organization)
			.set({ parentId: puskomlekadOrg.id })
			.where(eq(authSchema.organization.id, orgWilayah.id));

		const orgWarehouseId = uuidv4();
		await db.insert(schema.warehouse).values({
			id: orgWarehouseId,
			name: `Gudang Matbek ${namaSatuan}`,
			location: `Markas ${namaSatuan}`,
			organizationId: orgWilayah.id
		});
		console.log(`Created warehouse: Gudang Matbek ${namaSatuan}`);


		allOrganizations.push({ ...orgWilayah, warehouseId: orgWarehouseId });
		console.log(`─── Satuan ${namaSatuan} berhasil disinkronkan.`);
	}

	// --- Create Users for Each Role and Assign to Organizations, then Seed Items ---
	const roleNames = Object.keys(allAuthRoles); // Get role names from the defined object
	for (const org of allOrganizations) {
		console.log(`\n--- Seeding users and items for organization: ${org.name} ---`);

		// Ensure the warehouseId is available from the extended organization object
		const orgWarehouseId = org.warehouseId;
		if (!orgWarehouseId) {
			console.error(`No warehouseId found for organization ${org.name}. Skipping item seeding.`);
			continue;
		}

		for (const roleName of roleNames) {
			const email = `${roleName.toLowerCase()}.${org.slug.replace(/-/g, '')}@example.com`;
			const name = `${roleName} ${org.name}`;

			// Check if user already exists (e.g., global superadmin user for 'superadmin' role)
			let userRecord = await db.query.user.findFirst({
				where: eq(authSchema.user.email, email)
			});

			if (!userRecord) {
				const userResponse = await auth.api.signUpEmail({
					body: {
						email: email,
						password: 'password123',
						name: name
					}
				});
				// Ensure userResponse.user.image is string | null, not undefined, to match Drizzle schema
				userRecord = {
					...userResponse.user,
					image: userResponse.user.image === undefined ? null : userResponse.user.image
				};
			}

			if (userRecord) {
				await auth.api.addMember({
					body: {
						organizationId: org.id,
						userId: userRecord.id,
						role: roleName as keyof typeof allAuthRoles // Cast roleName to the expected type
					}
				});
				console.log(`   - User '${name}' (${roleName}) created and added to ${org.name}.`);
			} else {
				console.error(`Failed to create user for role ${roleName} in ${org.name}`);
			}
		}

		// --- Seed 5 Consumable Items and 5 Asset Items per Organization ---
		// Consumable Items
		for (let i = 1; i <= 5; i++) {
			const itemId = uuidv4();
			const itemName = `Consumable Item ${i} (${org.name})`;
			await db.insert(schema.item).values({
				id: itemId,
				baseUnit: 'PCS',
				name: itemName,
				type: 'CONSUMABLE',
				description: `Description for ${itemName}`
			});

			// Add stock for consumable item
			await db.insert(schema.stock).values({
				id: uuidv4(),
				itemId: itemId,
				warehouseId: orgWarehouseId,
				qty: Math.floor(Math.random() * 100) + 10 // Random qty between 10-109
			});
			console.log(`   - Consumable item '${itemName}' created with stock.`);
		}

		// Asset Items (2 ALKOMLEK, 3 PERNIKA_LEK - distributed)
		const assetTypes: ('ALKOMLEK' | 'PERNIKA_LEK')[] = ['ALKOMLEK', 'ALKOMLEK', 'PERNIKA_LEK', 'PERNIKA_LEK', 'PERNIKA_LEK'];
		for (let i = 0; i < 5; i++) {
			const itemId = uuidv4();
			const equipmentType = assetTypes[i];
			const itemName = `Asset Item ${i + 1} (${equipmentType} - ${org.name})`;
			await db.insert(schema.item).values({
				id: itemId,
				baseUnit: 'UNIT',
				name: itemName,
				type: 'ASSET',
				equipmentType: equipmentType,
				description: `Description for ${itemName}`
			});

			// Create equipment for this asset item
			await db.insert(schema.equipment).values({
				id: uuidv4(),
				itemId: itemId,
				serialNumber: `SN-${org.slug.substring(0, 5)}-${equipmentType.substring(0, 4)}-${i + 1}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
				brand: `Brand ${i + 1}`,
				warehouseId: orgWarehouseId,
				organizationId: org.id,
				condition: i % 3 === 0 ? 'RUSAK_RINGAN' : 'BAIK', // Vary condition
				status: 'READY'
			});
			console.log(`   - Asset item '${itemName}' created with equipment.`);
		}
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
