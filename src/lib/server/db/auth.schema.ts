import { relations } from 'drizzle-orm';
import { mysqlTable, varchar, text, timestamp, boolean, index } from 'drizzle-orm/mysql-core';
import { warehouse } from './schema';

export const user = mysqlTable('user', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 255 }).notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { fsp: 3 })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
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
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

// Tabel Kesatuan
export const organization = mysqlTable('organization', {
	id: varchar('id', { length: 36 }).primaryKey(),
	name: text('name').notNull(),
	slug: varchar('slug', { length: 255 }).unique(),
	logo: text('logo'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	metadata: text('metadata'),

	// Jika null, maka ini adalah Mabes (Induk)
	// Jika berisi ID, maka ini adalah Kesatuan Wilayah (Anak)
	parentId: varchar('parent_id', { length: 36 })
});

// Tabel Member (Relasi User & Kesatuan)
export const member = mysqlTable('member', {
	id: varchar('id', { length: 36 }).primaryKey(),
	organizationId: varchar('organization_id', { length: 36 }).references(() => organization.id, {
		onDelete: 'cascade'
	}),
	userId: varchar('user_id', { length: 36 }).references(() => user.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 50 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const organizationRelations = relations(organization, ({ many, one }) => ({
	warehouses: many(warehouse),
	parent: one(organization, {
		fields: [organization.parentId],
		references: [organization.id]
	}),
	children: many(organization)
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
