import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';
import { Faker, id_ID } from '@faker-js/faker';

const faker = new Faker({ locale: [id_ID] });

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, username } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';

import {
	accessControl,
	kakomlek,
	operatorBinmatDanBekharrah,
	operatorPusatDanDaerah,
	pimpinan,
	superadmin
} from '../auth.roles';

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
	plugins: [
		username(),
		organization({
			ac: accessControl,
			roles: allAuthRoles
		})
	]
});

const alatList: string[] = [
	'Server Rack',
	'UPS (Uninterruptible Power Supply)',
	'Router Jaringan',
	'Switch Managed',
	'Access Point',
	'Laptop Operator',
	'PC Workstation',
	'Printer Laser',
	'Scanner Dokumen'
];

const bhpList: string[] = [
	'Kabel LAN (UTP Cat6)',
	'Konektor RJ45',
	'Thermal Paste CPU',
	'Label Stiker Inventaris',
	'Kabel Power Cadangan',
	'Tinta Printer',
	'Kertas A4',
	'Baterai CMOS',
	'Cable Tie (Pengikat Kabel)',
	'Isolasi Listrik'
];

async function main() {
	console.log('Sedang melakukan seeding...');

	console.log('Menghapus data lama...');
	await db.delete(schema.notification);
	await db.delete(schema.auditLog);
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

	const globalSuperadminResponse = await auth.api.signUpEmail({
		body: {
			email: 'global.superadmin@gmail.com',
			username: 'global.superadmin',
			displayUsername: 'Global Superadmin',
			password: 'password123',
			name: 'Global Superadmin'
		}
	});
	const globalSuperadminId = globalSuperadminResponse.user.id;

	const puskomlekadOrg = await auth.api.createOrganization({
		body: {
			name: 'PUSKOMLEKAD',
			slug: 'puskomlekad',
			userId: globalSuperadminId
		}
	});

	if (!puskomlekadOrg) {
		console.error('Failed to create PUSKOMLEKAD organization.');
		process.exit(1);
	}

	const puskomlekadWarehouseId = uuidv4();
	await db.insert(schema.warehouse).values({
		id: puskomlekadWarehouseId,
		name: `Gudang Matbek PUSKOMLEKAD`,
		location: `Markas PUSKOMLEKAD`,
		organizationId: puskomlekadOrg.id
	});

	const allOrganizations = [];
	allOrganizations.push({
		...puskomlekadOrg,
		warehouseId: puskomlekadWarehouseId,
		users: [] as any[]
	});

	const daftarSatuan = [
		'ISKDR MDA',
		'BUKIT BRSN',
		'SRIWIJAYA',
		'SILIWANGI',
		'DIPENOGORO',
		'BRAWIJAYA',
		'MULAWARMAN',
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

	for (const namaSatuan of daftarSatuan) {
		const slug = namaSatuan.toLowerCase().replace(/\s+/g, '-');
		const orgWilayah = await auth.api.createOrganization({
			body: { name: namaSatuan, slug: slug, userId: globalSuperadminId }
		});

		if (!orgWilayah) continue;

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

		allOrganizations.push({ ...orgWilayah, warehouseId: orgWarehouseId, users: [] as any[] });
		console.log(`Created organization: ${orgWilayah.name}`);
	}

	for (const org of allOrganizations) {
		console.log(`\n--- Seeding for ${org.name} ---`);

		// Helper to format Role and Org Name
		const toTitleCase = (str: string) =>
			str
				.toLowerCase()
				.split(' ')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');

		const formatRoleLabel = (role: string) => {
			const result = role.replace(/([A-Z])/g, ' $1');
			return result.charAt(0).toUpperCase() + result.slice(1);
		};

		const roleName = 'kakomlek';

		const cleanOrgName = org.name.toLowerCase().replace(/\s+/g, '_');
		const username = `${roleName}.${cleanOrgName}`;
		const email = `${roleName}_${cleanOrgName}@gmail.com`;
		const roleLabel = formatRoleLabel(roleName);
		const orgNameTitleCase = toTitleCase(org.name);
		const name = `${roleLabel} ${orgNameTitleCase}`;

		try {
			// Create user and add to organization with role
			await auth.api.signUpEmail({
				body: {
					email,
					password: roleName,
					name,
					username,
					displayUsername: name
				}
			});
			const userRec = await db.query.user.findFirst({
				where: eq(authSchema.user.username, username)
			});
			if (userRec) {
				await auth.api.addMember({
					body: { organizationId: org.id, userId: userRec.id, role: roleName as any }
				});
				org.users.push({ id: userRec.id, role: roleName });
			}
		} catch (e) {
			console.error(`Gagal membuat user ${username}:`, e);
		}

		// Seed Users
		// for (const roleName of Object.keys(allAuthRoles)) {
		// 	const cleanOrgName = org.name.toLowerCase().replace(/\s+/g, '_');
		// 	const username = `${roleName}.${cleanOrgName}`;
		// 	const email = `${roleName}_${cleanOrgName}@gmail.com`;
		// 	const roleLabel = formatRoleLabel(roleName);
		// 	const orgNameTitleCase = toTitleCase(org.name);
		// 	const name = `${roleLabel} ${orgNameTitleCase}`;

		// 	try {
		// 		// Create user and add to organization with role
		// 		await auth.api.signUpEmail({
		// 			body: {
		// 				email,
		// 				password: roleName,
		// 				name,
		// 				username,
		// 				displayUsername: name
		// 			}
		// 		});
		// 		const userRec = await db.query.user.findFirst({
		// 			where: eq(authSchema.user.username, username)
		// 		});
		// 		if (userRec) {
		// 			await auth.api.addMember({
		// 				body: { organizationId: org.id, userId: userRec.id, role: roleName as any }
		// 			});
		// 			org.users.push({ id: userRec.id, role: roleName });
		// 		}
		// 	} catch (e) {
		// 		console.error(`Gagal membuat user ${username}:`, e);
		// 	}
		// }
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
