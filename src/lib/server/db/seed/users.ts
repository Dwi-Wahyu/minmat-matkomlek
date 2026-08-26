import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
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
} from '../../auth.roles';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const allAuthRoles = {
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

async function main() {
	console.log('Sedang melakukan seeding user...');

	const orgs = await db.query.organization.findMany();

	if (orgs.length === 0) {
		console.error('Tidak ada organisasi ditemukan. Jalankan seed.ts terlebih dahulu.');
		process.exit(1);
	}

	for (const org of orgs) {
		console.log(`\n--- Seeding users for ${org.name} ---`);

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

		const usernameMapping: Record<string, string> = {
			operatorPusatDanDaerah: 'operatorpd',
			operatorBinmatDanBekharrah: 'operatorbb'
		};

		for (const roleName of Object.keys(allAuthRoles)) {
			const shortRoleName = usernameMapping[roleName] || roleName;
			const cleanOrgName = org.name.toLowerCase().replace(/\s+/g, '_');
			const usernameValue = `${shortRoleName}.${cleanOrgName}`;
			const email = `${shortRoleName}_${cleanOrgName}@gmail.com`;
			const roleLabel = formatRoleLabel(roleName);
			const orgNameTitleCase = toTitleCase(org.name);
			const name = `${roleLabel} ${orgNameTitleCase}`;

			// Cek apakah user sudah ada
			const existingUser = await db.query.user.findFirst({
				where: eq(authSchema.user.username, usernameValue)
			});

			if (existingUser) {
				console.log(`Skip user: ${usernameValue} (sudah ada)`);
				continue;
			}

			try {
				const signUpRes = await auth.api.signUpEmail({
					body: {
						email,
						password: roleName,
						name,
						username: usernameValue,
						displayUsername: name
					}
				});

				if (signUpRes.user) {
					await auth.api.addMember({
						body: {
							organizationId: org.id,
							userId: signUpRes.user.id,
							role: roleName as
								| 'operatorPusatDanDaerah'
								| 'operatorBinmatDanBekharrah'
								| 'pimpinan'
								| 'superadmin'
								| 'kakomlek'
						}
					});
					console.log(`User created: ${usernameValue} [${roleName}]`);
				}
			} catch (e) {
				console.error(`Gagal membuat user ${usernameValue}:`, e);
			}
		}
	}

	console.log('\nSeeding user selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding user gagal:', err);
	process.exit(1);
});
