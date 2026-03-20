import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	int,
	mysqlEnum,
	index,
	uniqueIndex,
	unique
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { organization, user } from './auth.schema';

export const warehouse = mysqlTable('warehouse', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	location: text('location'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'restrict'
	})
});

export const equipment = mysqlTable(
	'equipment',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		name: varchar('name', { length: 255 }).notNull(),
		serialNumber: varchar('serial_number', { length: 100 }).unique(),
		brand: varchar('brand', { length: 100 }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),

		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

		itemId: varchar('item_id', { length: 36 })
			.notNull()
			.references(() => item.id),

		type: mysqlEnum('type', ['ALKOMLEK', 'PERNIKA_LEK']).notNull(),

		category: varchar('category', { length: 100 }).notNull(),

		condition: mysqlEnum('condition', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'])
			.default('BAIK')
			.notNull(),

		status: mysqlEnum('status', ['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE']).default('READY'),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_type_idx').on(table.type),
		index('equipment_condition_idx').on(table.condition)
	]
);

export const item = mysqlTable('item', {
	id: varchar('id', { length: 36 }).primaryKey(),

	name: varchar('name', { length: 255 }).notNull(),

	type: mysqlEnum('type', ['ASSET', 'CONSUMABLE']).notNull(),

	baseUnit: mysqlEnum('base_unit', ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT']).notNull(),

	description: text('description'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const itemUnitConversion = mysqlTable(
	'item_unit_conversion',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		fromUnit: varchar('from_unit', { length: 20 }).notNull(), // BOX
		toUnit: varchar('to_unit', { length: 20 }).notNull(), // PCS

		multiplier: int('multiplier').notNull() // 10
	},
	(table) => [unique().on(table.itemId, table.fromUnit, table.toUnit)]
);

export const stock = mysqlTable(
	'stock',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id, {
			onDelete: 'cascade'
		}),

		qty: int('qty').default(0).notNull(),

		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
	},

	(table) => [
		index('stock_item_idx').on(table.itemId),
		uniqueIndex('stock_unique_idx').on(table.itemId, table.warehouseId)
	]
);

export const stockMovement = mysqlTable(
	'stock_movement',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),

		fromWarehouseId: varchar('from_warehouse_id', { length: 36 }).references(() => warehouse.id),

		toWarehouseId: varchar('to_warehouse_id', { length: 36 }).references(() => warehouse.id),

		movementType: mysqlEnum('movement_type', ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER']).notNull(),

		qty: int('qty').notNull(),

		unit: varchar('unit', { length: 20 }).notNull(), // PCS / BOX

		referenceId: varchar('reference_id', { length: 36 }), // link ke transaksi

		note: text('note'),

		createdBy: varchar('created_by', { length: 36 }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('stock_movement_item_idx').on(table.itemId)]
);

export const movementClassificationEnum = mysqlEnum('movement_classification', [
	'BALKIR', // Barang Terkirim (dalam pengiriman/ekspedisi)
	'KOMUNITY', // Masuk ke komunitas/satuan pemakai (serah terima)
	'TRANSITO' // Gudang Transit / Penyimpanan Sementara (seperti di UI)
]);

export const inventoryMovement = mysqlTable('inventory_movement', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	equipmentId: varchar('equipment_id', { length: 36 }).notNull(), // UUID ke equipment

	// Klasifikasi utama: BALKIR, KOMUNITY, atau TRANSITO
	classification: movementClassificationEnum.notNull(),

	// Detail nama lokasi (misal: "Gudang Transit 2" di UI, "Truk Ekspedisi A", "Yonif 201")
	specificLocationName: varchar('specific_location_name', { length: 255 }).notNull(),

	// Tipe pergerakan teknis (Sesuai Dokumen MINMAT poin 3.1)
	movementType: mysqlEnum('movement_type', [
		'MASUK',
		'KELUAR',
		'DISTRIBUSI',
		'PINJAM',
		'KEMBALI'
	]).notNull(),

	// Gudang asal/tujuan fisik (jika relevan, misal untuk Transito)
	fromWarehouseId: varchar('from_warehouse_id', { length: 36 }),
	toWarehouseId: varchar('to_warehouse_id', { length: 36 }),

	quantity: int('quantity').notNull().default(1), // Untuk asset biasanya 1
	keterangan: text('keterangan'), // Contoh di UI: "Robek kecil", "Normal"

	// Info Penanggung Jawab dari UI
	penanggungJawab: varchar('penanggung_jawab', { length: 255 }),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const distribution = mysqlTable('distribution', {
	id: varchar('id', { length: 36 }).primaryKey(),

	fromOrganizationId: varchar('from_org_id', { length: 36 }).references(() => organization.id),

	toOrganizationId: varchar('to_org_id', { length: 36 }).references(() => organization.id),

	status: mysqlEnum('status', ['DRAFT', 'APPROVED', 'SHIPPED', 'RECEIVED']).default('DRAFT'),

	requestedBy: varchar('requested_by', { length: 36 }).references(() => user.id),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const distributionItem = mysqlTable('distribution_item', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),

	distributionId: varchar('distribution_id', { length: 36 })
		.notNull()
		.references(() => distribution.id, { onDelete: 'cascade' }),

	// Jika yang dikirim adalah ALAT
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),

	// Jika yang dikirim adalah BAHAN
	itemId: varchar('item_id', { length: 36 }).references(() => item.id),

	// Kuantitas & Satuan (Penting untuk Consumable)
	quantity: int('quantity').notNull().default(1),
	unit: varchar('unit', { length: 20 }), // misal: "PCS", "BOX", "UNIT"

	// Catatan kondisi spesifik barang saat akan dikirim
	note: text('note'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const maintenance = mysqlTable('maintenance', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),

	maintenanceType: mysqlEnum('maintenance_type', ['PERAWATAN', 'PERBAIKAN']).notNull(),
	description: text('description').notNull(),
	scheduledDate: timestamp('scheduled_date').notNull(),
	completionDate: timestamp('completion_date'),

	status: mysqlEnum('status', ['PENDING', 'IN_PROGRESS', 'COMPLETED']).default('PENDING').notNull(),
	technicianId: varchar('technician_id', { length: 36 }).references(() => user.id),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lending = mysqlTable('lending', {
	id: varchar('id', { length: 36 }).primaryKey(),

	unit: varchar('unit', { length: 100 }).notNull(),
	purpose: mysqlEnum('purpose', ['OPERASI', 'LATIHAN']).notNull(),

	status: mysqlEnum('status', ['DRAFT', 'APPROVED', 'DIPINJAM', 'KEMBALI']).default('DRAFT'),

	requestedBy: varchar('requested_by', { length: 36 }).references(() => user.id),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	startDate: timestamp('start_date').notNull(),
	endDate: timestamp('end_date'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const lendingItem = mysqlTable('lending_item', {
	id: varchar('id', { length: 36 }).primaryKey(),

	lendingId: varchar('lending_id', { length: 36 }).references(() => lending.id, {
		onDelete: 'cascade'
	}),

	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),

	qty: int('qty').default(1)
});

export const approval = mysqlTable('approval', {
	id: varchar('id', { length: 36 }).primaryKey(),

	referenceType: mysqlEnum('reference_type', ['LENDING', 'DISTRIBUTION', 'MAINTENANCE']),

	referenceId: varchar('reference_id', { length: 36 }),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	status: mysqlEnum('status', ['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),

	note: text('note'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const auditLog = mysqlTable('audit_log', {
	id: varchar('id', { length: 36 }).primaryKey(),

	userId: varchar('user_id', { length: 36 }).references(() => user.id),

	action: varchar('action', { length: 50 }),
	tableName: varchar('table_name', { length: 50 }),

	recordId: varchar('record_id', { length: 36 }),

	oldValue: text('old_value'),
	newValue: text('new_value'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const reportBtk16 = mysqlTable('report_btk16', {
	id: varchar('id', { length: 36 }).primaryKey(),

	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),

	itemName: varchar('item_name', { length: 255 }),

	openingBalance: int('opening_balance'),
	incoming: int('incoming'),
	outgoing: int('outgoing'),
	closingBalance: int('closing_balance'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const warehouseRelations = relations(warehouse, ({ many, one }) => ({
	equipments: many(equipment),
	organization: one(organization)
}));

export const equipmentRelations = relations(equipment, ({ many, one }) => ({
	item: one(item, {
		fields: [equipment.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, { fields: [equipment.warehouseId], references: [warehouse.id] }),
	maintenances: many(maintenance),
	lendingItems: many(lendingItem)
}));

export const maintenanceRelations = relations(maintenance, ({ one }) => ({
	equipment: one(equipment, {
		fields: [maintenance.equipmentId],
		references: [equipment.id]
	})
}));

export const approvalRelations = relations(approval, ({ one }) => ({
	approvedByUser: one(user, {
		fields: [approval.approvedBy],
		references: [user.id]
	})
}));

export const distributionRelations = relations(distribution, ({ many }) => ({
	items: many(distributionItem)
}));

export const distributionItemRelations = relations(distributionItem, ({ one }) => ({
	distribution: one(distribution, {
		fields: [distributionItem.distributionId],
		references: [distribution.id]
	}),
	equipment: one(equipment, {
		fields: [distributionItem.equipmentId],
		references: [equipment.id]
	}),
	item: one(item, {
		fields: [distributionItem.itemId],
		references: [item.id]
	})
}));

export const lendingRelations = relations(lending, ({ many, one }) => ({
	organization: one(organization, {
		fields: [lending.organizationId],
		references: [organization.id]
	}),
	requestedByUser: one(user, {
		fields: [lending.requestedBy],
		references: [user.id]
	}),
	approvedByUser: one(user, {
		fields: [lending.approvedBy],
		references: [user.id]
	}),
	approvals: many(approval),
	items: many(lendingItem)
}));

export const lendingItemRelations = relations(lendingItem, ({ one }) => ({
	lending: one(lending, {
		fields: [lendingItem.lendingId],
		references: [lending.id]
	}),
	equipment: one(equipment, {
		fields: [lendingItem.equipmentId],
		references: [equipment.id]
	})
}));

export const itemRelations = relations(item, ({ many }) => ({
	stocks: many(stock),
	movements: many(stockMovement),
	unitConversions: many(itemUnitConversion)
}));

export const itemUnitConversionRelations = relations(itemUnitConversion, ({ one }) => ({
	item: one(item, {
		fields: [itemUnitConversion.itemId],
		references: [item.id]
	})
}));

export const stockRelations = relations(stock, ({ one }) => ({
	item: one(item, {
		fields: [stock.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, {
		fields: [stock.warehouseId],
		references: [warehouse.id]
	})
}));

export const stockMovementRelations = relations(stockMovement, ({ one }) => ({
	item: one(item, {
		fields: [stockMovement.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, {
		fields: [stockMovement.warehouseId],
		references: [warehouse.id]
	})
}));

export const inventoryMovementRelations = relations(inventoryMovement, ({ one }) => ({
	equipment: one(equipment, {
		fields: [inventoryMovement.equipmentId],
		references: [equipment.id]
	}),
	fromWarehouse: one(warehouse, {
		fields: [inventoryMovement.fromWarehouseId],
		references: [warehouse.id],
		relationName: 'from_warehouse_movement'
	}),
	toWarehouse: one(warehouse, {
		fields: [inventoryMovement.toWarehouseId],
		references: [warehouse.id],
		relationName: 'to_warehouse_movement'
	})
}));

export * from './auth.schema';
