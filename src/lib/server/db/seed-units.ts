import { db } from './index';
import { unit } from './schema';
import { nanoid } from 'nanoid';

async function seedUnits() {
	console.log('🌱 Seeding units with NanoID...');
	const units = [
		{ name: 'PCS', desc: 'Pieces' },
		{ name: 'BOX', desc: 'Box' },
		{ name: 'METER', desc: 'Meter' },
		{ name: 'ROLL', desc: 'Roll' },
		{ name: 'UNIT', desc: 'Unit' },
		{ name: 'SET', desc: 'Set' },
		{ name: 'BUAH', desc: 'Buah' },
		{ name: 'LOT', desc: 'Lot' },
		{ name: 'PAKET', desc: 'Paket' },
		{ name: 'CABINET', desc: 'Cabinet' },
		{ name: 'LITER', desc: 'Liter' },
		{ name: 'KG', desc: 'Kilogram' }
	];

	for (const u of units) {
		try {
			// Cek jika sudah ada berdasarkan nama
			const existing = await db.query.unit.findFirst({
				where: (table, { eq }) => eq(table.name, u.name)
			});

			if (!existing) {
				await db.insert(unit).values({
					id: nanoid(),
					name: u.name,
					description: u.desc
				});
				console.log(`✅ Unit ${u.name} created.`);
			} else {
				console.log(`ℹ️ Unit ${u.name} already exists, skipping.`);
			}
		} catch (error) {
			console.error(`❌ Error seeding unit ${u.name}:`, error);
		}
	}
	console.log('✨ Units seeding completed.');
	process.exit(0);
}

seedUnits();
