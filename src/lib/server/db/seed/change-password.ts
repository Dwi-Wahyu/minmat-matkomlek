import { config } from 'dotenv';
config();

import mysql from 'mysql2/promise';
import * as authSchema from '../auth.schema';
import { drizzle } from 'drizzle-orm/mysql2';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from 'better-auth/crypto';

const client = mysql.createPool(process.env.DATABASE_URL ?? '');
const db = drizzle(client, { schema: authSchema, mode: 'default' });

async function main() {
	const targetUsername = process.argv[2];
	if (!targetUsername) {
		console.error('Usage: bun run src/lib/server/db/seed/change-password.ts <username>');
		process.exit(1);
	}

	const defaultPassword = process.env.DEFAULT_PASSWORD;
	if (!defaultPassword) {
		console.error('DEFAULT_PASSWORD tidak ditemukan di file .env');
		process.exit(1);
	}

	console.log(`Mencari user dengan username: '${targetUsername}'...`);
	const existingUser = await db.query.user.findFirst({
		where: eq(authSchema.user.username, targetUsername)
	});

	if (!existingUser) {
		console.error(`User dengan username '${targetUsername}' tidak ditemukan.`);
		process.exit(1);
	}

	console.log(`User ditemukan (ID: ${existingUser.id}). Mengganti password ke DEFAULT_PASSWORD...`);
	const hashedPassword = await hashPassword(defaultPassword);

	await db
		.update(authSchema.account)
		.set({ password: hashedPassword })
		.where(
			and(
				eq(authSchema.account.userId, existingUser.id),
				eq(authSchema.account.providerId, 'credential')
			)
		);

	console.log(`Berhasil mengganti password untuk user '${targetUsername}'.`);
	process.exit(0);
}

main().catch((err) => {
	console.error('Terjadi kesalahan:', err);
	process.exit(1);
});
