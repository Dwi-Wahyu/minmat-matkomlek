import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from './schema';
import * as authSchema from './auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { v4 as uuidv4 } from 'uuid';
import { Faker, id_ID } from '@faker-js/faker';

const faker = new Faker({ locale: [id_ID] });

import { betterAuth } from 'better-auth/minimal';
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
		'MULAWARMN',
		'UDAYANA',
		'TANJUNG PR',
		'MERDRKA',
		'HASANUDDIN',
		'PATTIMURA',
		'CENDRAWASIH',
		'KASUARI'
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

	// Reference for distributions
	const allCreatedEquipment: any[] = [];
	const allCreatedConsumables: any[] = [];

	for (const org of allOrganizations) {
		console.log(`\n--- Seeding for ${org.name} ---`);

		// Seed Users
		for (const roleName of Object.keys(allAuthRoles)) {
			const name = faker.person.fullName();
			const email = faker.internet
				.email({ firstName: name.split(' ')[0], lastName: name.split(' ')[1] })
				.toLowerCase();
			try {
				// Create user and add to organization with role
				await auth.api.signUpEmail({
					body: {
						email,
						password: roleName,
						name,
						username: `${roleName}.${org.slug}`,
						displayUsername: name
					}
				});
				const userRec = await db.query.user.findFirst({
					where: eq(authSchema.user.username, `${roleName}.${org.slug}`)
				});
				if (userRec) {
					await auth.api.addMember({
						body: { organizationId: org.id, userId: userRec.id, role: roleName as any }
					});
					org.users.push({ id: userRec.id, role: roleName });
				}
			} catch (e) {}
		}

		// Seed BHP (Consumable)
		for (const name of bhpList) {
			const itemId = uuidv4();
			await db.insert(schema.item).values({
				id: itemId,
				baseUnit: 'PCS',
				name: `${name}`,
				type: 'CONSUMABLE',
				description: `Bahan habis pakai`
			});
			await db.insert(schema.stock).values({
				id: uuidv4(),
				itemId: itemId,
				warehouseId: org.warehouseId,
				qty: Math.floor(Math.random() * 500) + 100
			});
			allCreatedConsumables.push({ id: itemId, name, orgId: org.id });
		}

		// Seed Alat (Asset)
		for (let i = 0; i < alatList.length; i++) {
			const name = alatList[i];
			const itemId = uuidv4();
			const equipmentType = i % 2 === 0 ? 'ALKOMLEK' : 'PERNIKA_LEK';

			await db.insert(schema.item).values({
				id: itemId,
				baseUnit: 'UNIT',
				name: `${name}`,
				type: 'ASSET',
				equipmentType: equipmentType,
				description: `Peralatan ${equipmentType}`
			});

			for (let j = 1; j <= 5; j++) {
				const eqId = uuidv4();
				const sn = `SN-${org.slug.substring(0, 3).toUpperCase()}-${i}-${j}-${uuidv4().substring(0, 4).toUpperCase()}`;
				await db.insert(schema.equipment).values({
					id: eqId,
					itemId: itemId,
					serialNumber: sn,
					brand: faker.company.name(),
					warehouseId: org.warehouseId,
					organizationId: org.id,
					condition: 'BAIK',
					status: 'READY'
				});
				allCreatedEquipment.push({ id: eqId, sn, orgId: org.id, itemId });
			}
		}

		// Seed Movements for Dashboard
		console.log(`Seeding movements for ${org.name}...`);
		const orgUser = org.users[0]?.id;
		const now = new Date();

		for (let i = 0; i < 20; i++) {
			const daysAgo = Math.floor(Math.random() * 25);
			const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

			// Mix of types to populate different dashboard stats
			const types = [
				{ event: 'RECEIVE', class: 'TRANSITO' }, // Inventory In
				{ event: 'ISSUE', class: 'TRANSITO' }, // Inventory Out
				{ event: 'ISSUE', class: 'KOMUNITY' }, // Distribution Out
				{ event: 'RECEIVE', class: 'KOMUNITY' }
			];
			const type = types[Math.floor(Math.random() * types.length)];
			const isEq = Math.random() > 0.5;

			if (isEq) {
				const eqp = allCreatedEquipment.filter((e) => e.orgId === org.id)[
					Math.floor(Math.random() * 5)
				];
				if (eqp) {
					await db.insert(schema.movement).values({
						id: uuidv4(),
						equipmentId: eqp.id,
						eventType: type.event as any,
						classification: type.class as any,
						qty: 1,
						organizationId: org.id,
						fromWarehouseId: org.warehouseId,
						picId: orgUser,
						createdAt
					});
				}
			} else {
				const bhp = allCreatedConsumables.filter((b) => b.orgId === org.id)[
					Math.floor(Math.random() * 5)
				];
				if (bhp) {
					await db.insert(schema.movement).values({
						id: uuidv4(),
						itemId: bhp.id,
						eventType: type.event as any,
						classification: type.class as any,
						qty: Math.floor(Math.random() * 10) + 1,
						unit: 'PCS',
						organizationId: org.id,
						fromWarehouseId: org.warehouseId,
						picId: orgUser,
						createdAt
					});
				}
			}
		}
	}

	// Seed Distributions
	console.log('\n--- Seeding Distributions ---');
	const statuses = ['DRAFT', 'VALIDATED', 'APPROVED', 'SHIPPED', 'RECEIVED'];
	const sourceOrg = allOrganizations[0]; // PUSKOMLEKAD

	for (let i = 1; i < allOrganizations.length; i++) {
		const targetOrg = allOrganizations[i];
		const distId = uuidv4();
		const status = statuses[Math.floor(Math.random() * statuses.length)] as any;

		await db.insert(schema.distribution).values({
			id: distId,
			fromOrganizationId: sourceOrg.id,
			toOrganizationId: targetOrg.id,
			status: status,
			requestedBy: sourceOrg.users[0]?.id,
			createdAt: new Date()
		});

		// Add 2 items per distribution
		const eqps = allCreatedEquipment
			.filter((e) => e.orgId === sourceOrg.id)
			.slice(i * 2, i * 2 + 2);
		for (const eqp of eqps) {
			await db.insert(schema.distributionItem).values({
				id: uuidv4(),
				distributionId: distId,
				equipmentId: eqp.id,
				quantity: 1,
				note: 'Distribusi rutin'
			});
		}

		if (status !== 'DRAFT' && status !== 'VALIDATED') {
			await db.insert(schema.approval).values({
				id: uuidv4(),
				referenceType: 'DISTRIBUTION',
				referenceId: distId,
				approvedBy:
					sourceOrg.users.find((u) => u.role === 'pimpinan')?.id || sourceOrg.users[0]?.id,
				status: 'APPROVED',
				createdAt: new Date()
			});
		}

		console.log(`Created distribution: PUSKOMLEKAD -> ${targetOrg.name} (${status})`);
	}

	console.log('\nSeeding selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding gagal:', err);
	process.exit(1);
});
