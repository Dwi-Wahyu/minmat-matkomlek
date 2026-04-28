import {
	mysqlTable,
	varchar,
	text,
	timestamp,
	boolean,
	mysqlEnum,
	index,
	uniqueIndex,
	unique,
	decimal
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
		serialNumber: varchar('serial_number', { length: 100 }).unique(),
		brand: varchar('brand', { length: 100 }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id),

		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

		itemId: varchar('item_id', { length: 36 })
			.notNull()
			.references(() => item.id), // Ensure item.type = 'ASSET'

		condition: mysqlEnum('condition', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'])
			.default('BAIK')
			.notNull(),

		status: mysqlEnum('status', ['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE']).default('READY'),

		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_condition_idx').on(table.condition),
		index('equipment_item_id_idx').on(table.itemId) // Add index for itemId
	]
);

export const item = mysqlTable('item', {
	id: varchar('id', { length: 36 }).primaryKey(),

	name: varchar('name', { length: 255 }).notNull(),

	type: mysqlEnum('type', ['ASSET', 'CONSUMABLE']).notNull(), // ASSET = individual, CONSUMABLE = quantity-based

	// Only applicable if type is ASSET
	equipmentType: mysqlEnum('equipment_type', ['ALKOMLEK', 'PERNIKA_LEK']),

	baseUnit: varchar('base_unit', { length: 21 })
		.notNull()
		.references(() => unit.id), // Reference to unit table

	description: text('description'),

	imagePath: text('image_path'),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const unit = mysqlTable('unit', {
	id: varchar('id', { length: 21 }).primaryKey(),
	name: varchar('name', { length: 20 }).notNull().unique(), // PCS, BOX, etc
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const itemUnitConversion = mysqlTable(
	'item_unit_conversion',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		fromUnit: varchar('from_unit', { length: 20 }).notNull(), // BOX
		toUnit: varchar('to_unit', { length: 20 }).notNull(), // PCS (Harus selalu merujuk ke item.baseUnit)

		multiplier: decimal('multiplier', { precision: 12, scale: 4 }).notNull() // 10.0000
	},
	(table) => [
		index('item_unit_conv_item_idx').on(table.itemId),
		unique().on(table.itemId, table.fromUnit) // Mencegah duplikasi rasio untuk satuan yang sama
	]
);

export const stock = mysqlTable(
	'stock',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),

		warehouseId: varchar('warehouse_id', { length: 36 }).references(() => warehouse.id, {
			onDelete: 'cascade'
		}),

		qty: decimal('qty', { precision: 12, scale: 4 }).default('0.0000').notNull(),

		updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
	},

	(table) => [
		index('stock_item_idx').on(table.itemId),
		uniqueIndex('stock_unique_idx').on(table.itemId, table.warehouseId)
	]
);

export const movementEventTypeEnum = mysqlEnum('movement_event_type', [
	'RECEIVE', // Incoming stock/equipment (IN, MASUK)
	'ISSUE', // Outgoing stock/equipment (OUT, KELUAR)
	'ADJUSTMENT', // Stock adjustment
	'TRANSFER_OUT', // Transfer out of a warehouse/org
	'TRANSFER_IN', // Transfer into a warehouse/org
	'LOAN_OUT', // Equipment loaned out (PINJAM)
	'LOAN_RETURN', // Equipment returned from loan (KEMBALI)
	'DISTRIBUTE_OUT', // Equipment/Item distributed out
	'DISTRIBUTE_IN', // Equipment/Item received from distribution
	'MAINTENANCE_IN', // Equipment sent for maintenance
	'MAINTENANCE_OUT' // Equipment returned from maintenance
]);

export const movementClassificationEnum = mysqlEnum('movement_classification', [
	'BALKIR', // Barang Terkirim (dalam pengiriman/ekspedisi)
	'KOMUNITY', // Masuk ke komunitas/satuan pemakai (serah terima)
	'TRANSITO' // Gudang Transit / Penyimpanan Sementara
]);

export const movementReferenceTypeEnum = mysqlEnum('movement_reference_type', [
	'LENDING',
	'DISTRIBUTION',
	'MAINTENANCE'
]);

export const movement = mysqlTable(
	'movement',
	{
		id: varchar('id', { length: 36 })
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),

		// Link to either item (for consumables) or equipment (for assets)
		itemId: varchar('item_id', { length: 36 }).references(() => item.id),
		equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),

		// Type of movement event
		eventType: movementEventTypeEnum.notNull(),

		// Quantity for consumable items (default 1 for assets)
		qty: decimal('qty', { precision: 12, scale: 4 }).notNull().default('1.0000'),

		// Unit for consumable items (e.g., "PCS", "BOX")
		unit: varchar('unit', { length: 20 }),

		// Classification for asset movements (BALKIR, KOMUNITY, TRANSITO)
		classification: movementClassificationEnum,

		// Specific location name (e.g., "Truk Ekspedisi A", "Yonif 201")
		specificLocationName: varchar('specific_location_name', { length: 255 }),

		// Source and Destination warehouses for transfers/movements
		fromWarehouseId: varchar('from_warehouse_id', { length: 36 }).references(() => warehouse.id),
		toWarehouseId: varchar('to_warehouse_id', { length: 36 }).references(() => warehouse.id),

		// Organization initiating or affected by the movement
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

		notes: text('notes'), // Combines description/keterangan/note

		picId: varchar('pic_id', { length: 36 }).references(() => user.id), // Person in Charge (createdBy, penanggungJawab)

		// Reference to other transactions
		referenceType: movementReferenceTypeEnum,
		referenceId: varchar('reference_id', { length: 36 }),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('movement_item_idx').on(table.itemId),
		index('movement_equipment_idx').on(table.equipmentId),
		index('movement_from_warehouse_idx').on(table.fromWarehouseId),
		index('movement_to_warehouse_idx').on(table.toWarehouseId),
		index('movement_organization_idx').on(table.organizationId),
		index('movement_reference_idx').on(table.referenceId)
	]
);

export const distribution = mysqlTable('distribution', {
	id: varchar('id', { length: 36 }).primaryKey(),

	fromOrganizationId: varchar('from_org_id', { length: 36 }).references(() => organization.id),

	toOrganizationId: varchar('to_org_id', { length: 36 }).references(() => organization.id),

	status: mysqlEnum('status', ['DRAFT', 'VALIDATED', 'APPROVED', 'SHIPPED', 'RECEIVED']).default(
		'DRAFT'
	),

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
	quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull().default('1.0000'),
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
	purpose: mysqlEnum('purpose', ['OPERASI', 'LATIHAN', 'PERINTAH_LANGSUNG']).notNull(),

	status: mysqlEnum('status', [
		'DRAFT',
		'APPROVED',
		'REJECTED',
		'PERINTAH_LANGSUNG',
		'DIPINJAM',
		'KEMBALI'
	]).default('DRAFT'),
	rejectedReason: text('rejected_reason'),

	overrideReason: text('override_reason'),
	overrideBy: varchar('override_by', { length: 36 }).references(() => user.id),

	requestedBy: varchar('requested_by', { length: 36 }).references(() => user.id),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

	approvedBy: varchar('approved_by', { length: 36 }).references(() => user.id),

	attachmentPath: text('attachment_path'),
	attachmentName: varchar('attachment_name', { length: 255 }),

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

	qty: decimal('qty', { precision: 12, scale: 4 }).default('1.0000')
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

export const importLog = mysqlTable('import_log', {
	id: varchar('id', { length: 36 }).primaryKey(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'cascade'
	}),
	userId: varchar('user_id', { length: 36 }).references(() => user.id),
	filename: varchar('filename', { length: 255 }).notNull(),
	status: mysqlEnum('status', ['SUCCESS', 'FAILED', 'PARTIAL']).default('SUCCESS'),
	totalRows: decimal('total_rows', { precision: 12, scale: 0 }).default('0'),
	successRows: decimal('success_rows', { precision: 12, scale: 0 }).default('0'),
	errorRows: decimal('error_rows', { precision: 12, scale: 0 }).default('0'),
	errorMessage: text('error_message'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const reportBtk16 = mysqlTable('report_btk16', {
	id: varchar('id', { length: 36 }).primaryKey(),

	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),

	periodStart: timestamp('period_start'),
	periodEnd: timestamp('period_end'),

	itemName: varchar('item_name', { length: 255 }),

	openingBalance: decimal('opening_balance', { precision: 12, scale: 4 }),
	incoming: decimal('incoming', { precision: 12, scale: 4 }),
	outgoing: decimal('outgoing', { precision: 12, scale: 4 }),
	closingBalance: decimal('closing_balance', { precision: 12, scale: 4 }),

	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const land = mysqlTable('land', {
	id: varchar('id', { length: 36 }).primaryKey(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'cascade'
	}),
	certificateNumber: varchar('certificate_number', { length: 255 }).notNull(),
	location: text('location').notNull(),
	area: decimal('area', { precision: 12, scale: 2 }).notNull(), // m2
	status: mysqlEnum('status', ['MILIK_TNI', 'LAINNYA']).notNull(),
	usage: varchar('usage', { length: 255 }).notNull(), // kantor, asmen, dll
	latitude: decimal('latitude', { precision: 10, scale: 8 }),
	longitude: decimal('longitude', { precision: 11, scale: 8 }),
	photoPath: text('photo_path'),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const building = mysqlTable('building', {
	id: varchar('id', { length: 36 }).primaryKey(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'cascade'
	}),
	code: varchar('code', { length: 100 }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	location: text('location').notNull(),
	type: varchar('type', { length: 255 }).notNull(), // kantor, asmen, dll
	area: decimal('area', { precision: 12, scale: 2 }).notNull(), // m2
	condition: mysqlEnum('condition', ['BAIK', 'RUSAK']).notNull(),
	status: mysqlEnum('status', ['MILIK_TNI', 'LAINNYA']).notNull(),
	latitude: decimal('latitude', { precision: 10, scale: 8 }),
	longitude: decimal('longitude', { precision: 11, scale: 8 }),
	photoPath: text('photo_path'),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().onUpdateNow()
});

export const notificationPriorityEnum = mysqlEnum('notification_priority', [
	'LOW',
	'MEDIUM',
	'HIGH'
]);

export const notification = mysqlTable(
	'notification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),

		// Target: can be specific user OR specific organization
		userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
			onDelete: 'cascade'
		}),

		title: varchar('title', { length: 255 }).notNull(),
		body: text('body').notNull(),

		priority: notificationPriorityEnum.default('MEDIUM').notNull(),

		read: boolean('read').default(false).notNull(),

		// Action metadata (JSON)
		// Example: { "type": "PEMINJAMAN_DETAIL", "resourceId": "...", "webPath": "...", "mobilePath": "..." }
		action: text('action'),

		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('notification_userId_idx').on(table.userId),
		index('notification_organizationId_idx').on(table.organizationId),
		index('notification_read_idx').on(table.read)
	]
);

export const warehouseRelations = relations(warehouse, ({ many, one }) => ({
	equipments: many(equipment),
	organization: one(organization, {
		fields: [warehouse.organizationId],
		references: [organization.id]
	})
}));

export const notificationRelations = relations(notification, ({ one }) => ({
	user: one(user, {
		fields: [notification.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [notification.organizationId],
		references: [organization.id]
	})
}));

export const equipmentRelations = relations(equipment, ({ many, one }) => ({
	item: one(item, {
		fields: [equipment.itemId],
		references: [item.id]
	}),
	warehouse: one(warehouse, { fields: [equipment.warehouseId], references: [warehouse.id] }),
	organization: one(organization, {
		fields: [equipment.organizationId],
		references: [organization.id]
	}),
	maintenances: many(maintenance),
	lendingItems: many(lendingItem),
	movements: many(movement)
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
	}),
	lending: one(lending, {
		fields: [approval.referenceId],
		references: [lending.id]
	}),
	distribution: one(distribution, {
		fields: [approval.referenceId],
		references: [distribution.id]
	}),
	maintenance: one(maintenance, {
		fields: [approval.referenceId],
		references: [maintenance.id]
	})
}));

export const distributionRelations = relations(distribution, ({ many, one }) => ({
	items: many(distributionItem),
	fromOrganization: one(organization, {
		fields: [distribution.fromOrganizationId],
		references: [organization.id]
	}),
	toOrganization: one(organization, {
		fields: [distribution.toOrganizationId],
		references: [organization.id]
	}),
	requestedByUser: one(user, {
		fields: [distribution.requestedBy],
		references: [user.id]
	}),
	approvedByUser: one(user, {
		fields: [distribution.approvedBy],
		references: [user.id]
	})
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
	overrideByUser: one(user, {
		fields: [lending.overrideBy],
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
	movements: many(movement),
	unitConversions: many(itemUnitConversion),
	equipments: many(equipment)
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

export const movementRelations = relations(movement, ({ one }) => ({
	item: one(item, {
		fields: [movement.itemId],
		references: [item.id]
	}),
	equipment: one(equipment, {
		fields: [movement.equipmentId],
		references: [equipment.id]
	}),
	fromWarehouse: one(warehouse, {
		fields: [movement.fromWarehouseId],
		references: [warehouse.id],
		relationName: 'movement_from_warehouse'
	}),
	toWarehouse: one(warehouse, {
		fields: [movement.toWarehouseId],
		references: [warehouse.id],
		relationName: 'movement_to_warehouse'
	}),
	organization: one(organization, {
		fields: [movement.organizationId],
		references: [organization.id]
	}),
	pic: one(user, {
		fields: [movement.picId],
		references: [user.id]
	})
}));

export const landRelations = relations(land, ({ one }) => ({
	organization: one(organization, {
		fields: [land.organizationId],
		references: [organization.id]
	})
}));

export const buildingRelations = relations(building, ({ one }) => ({
	organization: one(organization, {
		fields: [building.organizationId],
		references: [organization.id]
	})
}));

export const importLogRelations = relations(importLog, ({ one }) => ({
	organization: one(organization, {
		fields: [importLog.organizationId],
		references: [organization.id]
	}),
	user: one(user, {
		fields: [importLog.userId],
		references: [user.id]
	})
}));

export * from './auth.schema';
