import { db } from './index';
import { sql } from 'drizzle-orm';

async function check() {
	try {
		console.log('🔍 Checking database state...');
		
		// Cek struktur tabel item
		const [columns] = await db.execute(sql`DESCRIBE item`);
		console.log('\n📊 Item Table Columns:');
		console.table(columns);

		// Cek migrasi yang sudah terdaftar
		try {
			const [migrations] = await db.execute(sql`SELECT * FROM __drizzle_migrations`);
			console.log('\n📜 Applied Migrations:');
			console.table(migrations);
		} catch (e) {
			console.log('\n⚠️ Could not read __drizzle_migrations table.');
		}

	} catch (error) {
		console.error('❌ Error checking database:', error);
	}
	process.exit(0);
}

check();
