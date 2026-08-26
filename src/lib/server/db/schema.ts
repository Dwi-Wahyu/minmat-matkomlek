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
	decimal,
	int
} from 'drizzle-orm/mysql-core';
import { relations, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

// --- Auth Tables (Formerly auth.schema.ts) ---

export const movementClassificationEnum = mysqlEnum('movement_classification', [
	'BALKIR',
	'KOMUNITY',
	'TRANSITO'
]);

export const user = mysqlTable('user', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	username: varchar('username', { length: 255 }).notNull().unique(),
	displayUsername: varchar('display_username', { length: 255 }),
	email: varchar('email', { length: 255 }).notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const session = mysqlTable(
	'session',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		token: varchar('token', { length: 255 }).notNull().unique(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const apiKey = mysqlTable(
	'api_key',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		key: varchar('key', { length: 255 }).notNull().unique(),
		name: text('name'),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		expiresAt: timestamp('expires_at', { fsp: 3 }),
		lastUsedAt: timestamp('last_used_at', { fsp: 3 })
	},
	(table) => [index('api_key_userId_idx').on(table.userId)]
);

export const account = mysqlTable(
	'account',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { fsp: 3 }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { fsp: 3 }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = mysqlTable(
	'verification',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		identifier: varchar('identifier', { length: 255 }).notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
		createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { fsp: 3 })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const organization = mysqlTable('organization', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: text('name').notNull(),
	displayName: varchar('display_name', { length: 255 }),
	slug: varchar('slug', { length: 255 }).unique(),
	logo: text('logo'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	metadata: text('metadata'),
	parentId: varchar('parent_id', { length: 36 })
});

export const member = mysqlTable('member', {
	id: varchar('id', { length: 36 }).primaryKey(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'cascade'
	}),
	userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 50 }).notNull(),
	warehouseHeadType: mysqlEnum('warehouse_head_type', ['TRANSITO', 'BALKIR', 'KOMUNITY']),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// --- App Tables (Formerly schema.ts) ---

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
			.references(() => item.id),
		condition: mysqlEnum('condition', ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT', 'RUSAK_TOTAL'])
			.default('BAIK')
			.notNull(),
		status: mysqlEnum('status', ['READY', 'IN_USE', 'TRANSIT', 'MAINTENANCE', 'DISPOSED']).default(
			'READY'
		),
		// Nullable karena ribuan equipment lama belum tentu punya movement classification —
		// backfill akan mengisi sebanyak mungkin, sisanya tetap NULL (artinya "belum diklasifikasi").
		classification: mysqlEnum('classification', ['BALKIR', 'KOMUNITY', 'TRANSITO']),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').onUpdateNow()
	},
	(table) => [
		index('equipment_condition_idx').on(table.condition),
		index('equipment_item_id_idx').on(table.itemId),
		index('equipment_classification_idx').on(table.classification)
	]
);

export const itemCategory = mysqlTable('item_category', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: varchar('name', { length: 255 }).notNull(),
	parentId: varchar('parent_id', { length: 36 }), // Null jika kategori level 1 (Utama)
	order: int('order').default(0), // Untuk sorting urutan laporan (A, B, C atau I, II, III)
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const item = mysqlTable('item', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	type: mysqlEnum('type', ['ASSET', 'CONSUMABLE']).notNull(),
	equipmentType: mysqlEnum('equipment_type', ['ALKOMLEK', 'PERNIKA_LEK']),
	baseUnit: varchar('base_unit', { length: 21 })
		.notNull()
		.references(() => unit.id),
	categoryId: varchar('category_id', { length: 36 }).references(() => itemCategory.id),
	description: text('description'),
	imagePath: text('image_path'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const unit = mysqlTable('unit', {
	id: varchar('id', { length: 21 }).primaryKey(),
	name: varchar('name', { length: 20 }).notNull().unique(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const itemUnitConversion = mysqlTable(
	'item_unit_conversion',
	{
		id: varchar('id', { length: 36 }).primaryKey(),
		itemId: varchar('item_id', { length: 36 }).references(() => item.id, { onDelete: 'cascade' }),
		fromUnit: varchar('from_unit', { length: 20 }).notNull(),
		toUnit: varchar('to_unit', { length: 20 }).notNull(),
		multiplier: decimal('multiplier', { precision: 12, scale: 4 }).notNull()
	},
	(table) => [
		index('item_unit_conv_item_idx').on(table.itemId),
		unique().on(table.itemId, table.fromUnit)
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
	'RECEIVE',
	'ISSUE',
	'ADJUSTMENT',
	'TRANSFER_OUT',
	'TRANSFER_IN',
	'LOAN_OUT',
	'LOAN_RETURN',
	'DISTRIBUTE_OUT',
	'DISTRIBUTE_IN',
	'MAINTENANCE_IN',
	'MAINTENANCE_OUT'
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
		itemId: varchar('item_id', { length: 36 }).references(() => item.id),
		equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id),
		eventType: movementEventTypeEnum.notNull(),
		qty: decimal('qty', { precision: 12, scale: 4 }).notNull().default('1.0000'),
		unit: varchar('unit', { length: 20 }),
		classification: movementClassificationEnum,
		specificLocationName: varchar('specific_location_name', { length: 255 }),
		fromWarehouseId: varchar('from_warehouse_id', { length: 36 }).references(() => warehouse.id),
		toWarehouseId: varchar('to_warehouse_id', { length: 36 }).references(() => warehouse.id),
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id),
		notes: text('notes'),
		picId: varchar('pic_id', { length: 36 }).references(() => user.id),
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

export const distributionEquipment = mysqlTable('distribution_equipment', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	distributionId: varchar('distribution_id', { length: 36 })
		.notNull()
		.references(() => distribution.id, { onDelete: 'cascade' }),
	equipmentId: varchar('equipment_id', { length: 36 })
		.notNull()
		.references(() => equipment.id),
	note: text('note'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const distributionConsumable = mysqlTable('distribution_consumable', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	distributionId: varchar('distribution_id', { length: 36 })
		.notNull()
		.references(() => distribution.id, { onDelete: 'cascade' }),
	itemId: varchar('item_id', { length: 36 })
		.notNull()
		.references(() => item.id),
	fromWarehouseId: varchar('from_warehouse_id', { length: 36 }).references(() => warehouse.id),
	quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull().default('1.0000'),
	unit: varchar('unit', { length: 20 }),
	note: text('note'),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const maintenance = mysqlTable('maintenance', {
	id: varchar('id', { length: 36 }).primaryKey(),
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id, {
		onDelete: 'cascade'
	}),
	maintenanceType: mysqlEnum('maintenance_type', ['PERAWATAN', 'PERBAIKAN']).notNull(),
	description: text('description'),
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
		'KEMBALI',
		'DALAM_PENGIRIMAN',
		'DIKIRIM_KEMBALI'
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
	equipmentId: varchar('equipment_id', { length: 36 }).references(() => equipment.id)
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
	userId: varchar('user_id', { length: 36 }).references(() => user.id, {
		onDelete: 'cascade'
	}),
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
	filepath: text('filepath'),
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
	area: decimal('area', { precision: 12, scale: 2 }).notNull(),
	status: mysqlEnum('status', ['MILIK_TNI', 'LAINNYA']).notNull(),
	usage: varchar('usage', { length: 255 }).notNull(),
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
	type: varchar('type', { length: 255 }).notNull(),
	area: decimal('area', { precision: 12, scale: 2 }).notNull(),
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
		userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
		organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
			onDelete: 'cascade'
		}),
		title: varchar('title', { length: 255 }).notNull(),
		body: text('body').notNull(),
		priority: notificationPriorityEnum.default('MEDIUM').notNull(),
		read: boolean('read').default(false).notNull(),
		action: text('action'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('notification_userId_idx').on(table.userId),
		index('notification_organizationId_idx').on(table.organizationId),
		index('notification_read_idx').on(table.read)
	]
);

// --- Relations ---

export const organizationRelations = relations(organization, ({ many, one }) => ({
	warehouses: many(warehouse),
	parent: one(organization, {
		fields: [organization.parentId],
		references: [organization.id],
		relationName: 'organization_to_children'
	}),
	children: many(organization, {
		relationName: 'organization_to_children'
	}),
	members: many(member)
}));

export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
	members: many(member),
	apiKeys: many(apiKey)
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	})
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	})
}));

export const memberRelations = relations(member, ({ one }) => ({
	user: one(user, {
		fields: [member.userId],
		references: [user.id]
	}),
	organization: one(organization, {
		fields: [member.organizationId],
		references: [organization.id]
	})
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
	user: one(user, {
		fields: [apiKey.userId],
		references: [user.id]
	})
}));

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
	equipmentItems: many(distributionEquipment),
	consumableItems: many(distributionConsumable),
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

export const distributionEquipmentRelations = relations(distributionEquipment, ({ one }) => ({
	distribution: one(distribution, {
		fields: [distributionEquipment.distributionId],
		references: [distribution.id]
	}),
	equipment: one(equipment, {
		fields: [distributionEquipment.equipmentId],
		references: [equipment.id]
	})
}));

export const distributionConsumableRelations = relations(distributionConsumable, ({ one }) => ({
	distribution: one(distribution, {
		fields: [distributionConsumable.distributionId],
		references: [distribution.id]
	}),
	item: one(item, {
		fields: [distributionConsumable.itemId],
		references: [item.id]
	}),
	fromWarehouse: one(warehouse, {
		fields: [distributionConsumable.fromWarehouseId],
		references: [warehouse.id]
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

export const itemCategoryRelations = relations(itemCategory, ({ one, many }) => ({
	parent: one(itemCategory, {
		fields: [itemCategory.parentId],
		references: [itemCategory.id],
		relationName: 'category_to_children'
	}),
	children: many(itemCategory, {
		relationName: 'category_to_children'
	}),
	items: many(item)
}));

export const itemRelations = relations(item, ({ many, one }) => ({
	stocks: many(stock),
	movements: many(movement),
	unitConversions: many(itemUnitConversion),
	equipments: many(equipment),
	category: one(itemCategory, {
		fields: [item.categoryId],
		references: [itemCategory.id]
	})
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

// Types
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;
export type ApiKey = InferSelectModel<typeof apiKey>;
export type NewApiKey = InferInsertModel<typeof apiKey>;
export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;
export type Organization = InferSelectModel<typeof organization>;
export type NewOrganization = InferInsertModel<typeof organization>;
export type Member = InferSelectModel<typeof member>;
export type NewMember = InferInsertModel<typeof member>;
export type Warehouse = InferSelectModel<typeof warehouse>;
export type NewWarehouse = InferInsertModel<typeof warehouse>;
export type Equipment = InferSelectModel<typeof equipment>;
export type NewEquipment = InferInsertModel<typeof equipment>;
export type Item = InferSelectModel<typeof item>;
export type NewItem = InferInsertModel<typeof item>;
export type Unit = InferSelectModel<typeof unit>;
export type NewUnit = InferInsertModel<typeof unit>;
export type ItemUnitConversion = InferSelectModel<typeof itemUnitConversion>;
export type NewItemUnitConversion = InferInsertModel<typeof itemUnitConversion>;
export type Stock = InferSelectModel<typeof stock>;
export type NewStock = InferInsertModel<typeof stock>;
export type Movement = InferSelectModel<typeof movement>;
export type NewMovement = InferInsertModel<typeof movement>;
export type Distribution = InferSelectModel<typeof distribution>;
export type NewDistribution = InferInsertModel<typeof distribution>;
export type DistributionEquipment = InferSelectModel<typeof distributionEquipment>;
export type NewDistributionEquipment = InferInsertModel<typeof distributionEquipment>;
export type DistributionConsumable = InferSelectModel<typeof distributionConsumable>;
export type NewDistributionConsumable = InferInsertModel<typeof distributionConsumable>;
export type Maintenance = InferSelectModel<typeof maintenance>;
export type NewMaintenance = InferInsertModel<typeof maintenance>;
export type Lending = InferSelectModel<typeof lending>;
export type NewLending = InferInsertModel<typeof lending>;
export type LendingItem = InferSelectModel<typeof lendingItem>;
export type NewLendingItem = InferInsertModel<typeof lendingItem>;
export type Approval = InferSelectModel<typeof approval>;
export type NewApproval = InferInsertModel<typeof approval>;
export type AuditLog = InferSelectModel<typeof auditLog>;
export type NewAuditLog = InferInsertModel<typeof auditLog>;
export type ImportLog = InferSelectModel<typeof importLog>;
export type NewImportLog = InferInsertModel<typeof importLog>;
export type ReportBtk16 = InferSelectModel<typeof reportBtk16>;
export type NewReportBtk16 = InferInsertModel<typeof reportBtk16>;
export type Land = InferSelectModel<typeof land>;
export type NewLand = InferInsertModel<typeof land>;
export type Building = InferSelectModel<typeof building>;
export type NewBuilding = InferInsertModel<typeof building>;
export type Notification = InferSelectModel<typeof notification>;
export type NewNotification = InferInsertModel<typeof notification>;
export type ItemCategory = InferSelectModel<typeof itemCategory>;
export type NewItemCategory = InferInsertModel<typeof itemCategory>;
