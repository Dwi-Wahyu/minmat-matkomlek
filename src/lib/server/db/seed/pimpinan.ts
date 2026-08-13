import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as schema from '../schema';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, username } from 'better-auth/plugins';
import { and, eq, isNull } from 'drizzle-orm';

import { accessControl, pimpinan } from '../../auth.roles';
import { hashPassword } from 'better-auth/crypto';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: { ...schema, ...authSchema }, mode: 'default' });

const pimpinanRoles = {
	pimpinan
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
			roles: pimpinanRoles
		})
	]
});

async function updatePassword({
	userId,
	usernameValue,
	password
}: {
	userId: string;
	usernameValue: string;
	password: string;
}) {
	console.log(`Mengubah password user pimpinan: ${usernameValue}...`);
	try {
		const hashedPassword = await hashPassword(password);
		await db
			.update(authSchema.account)
			.set({ password: hashedPassword })
			.where(
				and(
					eq(authSchema.account.userId, userId),
					eq(authSchema.account.providerId, 'credential')
				)
			);
		console.log(`✅ Password berhasil diperbarui untuk ${usernameValue}`);
	} catch (e) {
		console.error(`❌ Gagal update password ${usernameValue}:`, e);
	}
}

async function main() {
	console.log('Memulai seeder pimpinan pusat...');

	const pimpinanPassword = process.env.PIMPINAN_PASSWORD || 'pimpinan123';
	const customPimpinanUsername = process.env.PIMPINAN_USERNAME;

	// Hanya ambil organisasi pusat (tanpa parentId)
	const parentOrgs = await db.query.organization.findMany({
		where: isNull(authSchema.organization.parentId)
	});

	if (parentOrgs.length === 0) {
		console.error('Tidak ada organisasi pusat (tanpa parentId) ditemukan. Jalankan seeder utama terlebih dahulu.');
		process.exit(1);
	}

	const toTitleCase = (str: string) =>
		str
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');

	for (const org of parentOrgs) {
		console.log(`\n--- Seeding Pimpinan Pusat untuk ${org.name} ---`);
		const orgSlug = (org.slug || org.name.toLowerCase().replace(/\s+/g, '_')).replace(/-/g, '_');
		const usernameValue = customPimpinanUsername || `pimpinan.${orgSlug}`;
		const email = `pimpinan_${orgSlug}@gmail.com`;
		const orgNameTitleCase = toTitleCase(org.name);
		const name = `Pimpinan ${orgNameTitleCase}`;

		// Cek apakah user sudah ada berdasarkan username
		const existingUser = await db.query.user.findFirst({
			where: eq(authSchema.user.username, usernameValue)
		});

		if (existingUser) {
			await updatePassword({
				userId: existingUser.id,
				usernameValue,
				password: pimpinanPassword
			});

			const existingMember = await db.query.member.findFirst({
				where: (m, { eq, and }) =>
					and(eq(m.userId, existingUser.id), eq(m.organizationId, org.id))
			});

			if (!existingMember) {
				await auth.api.addMember({
					body: {
						organizationId: org.id,
						userId: existingUser.id,
						role: 'pimpinan'
					}
				});
				console.log(`User ${usernameValue} ditambahkan sebagai member role pimpinan.`);
			} else if (existingMember.role !== 'pimpinan') {
				await db
					.update(authSchema.member)
					.set({ role: 'pimpinan' })
					.where(eq(authSchema.member.id, existingMember.id));
				console.log(`Role user ${usernameValue} diperbarui menjadi pimpinan.`);
			}
		} else {
			console.log(`Membuat user pimpinan pusat: ${usernameValue}...`);
			try {
				const signUpRes = await auth.api.signUpEmail({
					body: {
						email,
						password: pimpinanPassword,
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
							role: 'pimpinan'
						}
					});
					console.log(`✅ User pimpinan pusat berhasil dibuat: ${usernameValue}`);
				}
			} catch (e: any) {
				console.error(`❌ Gagal membuat user pimpinan ${usernameValue}:`, e.message || e);
			}
		}
	}

	console.log('\nSeeding pimpinan pusat selesai!');
	process.exit(0);
}

main().catch((err) => {
	console.error('Seeding pimpinan gagal:', err);
	process.exit(1);
});
