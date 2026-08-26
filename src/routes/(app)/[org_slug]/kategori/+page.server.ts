import { db } from '$lib/server/db';
import { itemCategory, auditLog } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { v4 as uuidv4 } from 'uuid';
import { invalidateCachePattern } from '$lib/server/redis';

import { getCategoryData } from './kategori.remote';

export const load: PageServerLoad = async ({ locals, url, params }) => {
	const { user } = locals;
	if (!user) throw redirect(302, '/');

	// RBAC checks
	const isCentral = user.organization?.parentId === null;
	const isKakomlek = user.role === 'kakomlek';
	const isSuperAdmin = user.role === 'superadmin';

	const canCreate = isCentral && (isKakomlek || isSuperAdmin);
	const canEdit = isCentral && (isKakomlek || isSuperAdmin);
	const canDelete = isCentral && isSuperAdmin;

	const q = url.searchParams.get('q') || '';
	const pageNum = Number(url.searchParams.get('page')) || 1;
	const limitNum = Number(url.searchParams.get('limit')) || 10;

	// Streaming promise for lazy loading category data with {#await}
	const categoryDataPromise = getCategoryData({
		orgSlug: params.org_slug,
		q,
		page: pageNum,
		limit: limitNum
	});

	// Get parent categories for the select dropdown in form modal (level 1 / parentId is null)
	const parentCategories = await db
		.select({
			id: itemCategory.id,
			name: itemCategory.name
		})
		.from(itemCategory)
		.where(isNull(itemCategory.parentId))
		.orderBy(itemCategory.order, itemCategory.name);

	return {
		parentCategories,
		canCreate,
		canEdit,
		canDelete,
		categoryDataPromise,
		filters: {
			q,
			page: pageNum,
			limit: limitNum
		}
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const isCentral = user.organization?.parentId === null;
		const isKakomlek = user.role === 'kakomlek';
		const isSuperAdmin = user.role === 'superadmin';
		const canCreate = isCentral && (isKakomlek || isSuperAdmin);

		if (!canCreate) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const orderStr = formData.get('order')?.toString().trim();
		const parentId = formData.get('parentId')?.toString().trim() || null;

		if (!name) {
			return fail(400, { message: 'Nama kategori harus diisi' });
		}

		const order = orderStr ? parseInt(orderStr, 10) : 0;

		try {
			const categoryId = uuidv4();
			await db.transaction(async (tx) => {
				await tx.insert(itemCategory).values({
					id: categoryId,
					name,
					parentId,
					order
				});

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'CREATE_ITEM_CATEGORY',
					tableName: 'item_category',
					recordId: categoryId,
					newValue: JSON.stringify({ name, parentId, order })
				});
			});

			// Invalidate all category lists in cache
			await invalidateCachePattern('category:list:*');

			return { success: true, message: 'Kategori berhasil ditambahkan' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal menambahkan kategori' });
		}
	},

	update: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const isCentral = user.organization?.parentId === null;
		const isKakomlek = user.role === 'kakomlek';
		const isSuperAdmin = user.role === 'superadmin';
		const canEdit = isCentral && (isKakomlek || isSuperAdmin);

		if (!canEdit) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim();
		const name = formData.get('name')?.toString().trim();
		const orderStr = formData.get('order')?.toString().trim();
		const parentId = formData.get('parentId')?.toString().trim() || null;

		if (!id || !name) {
			return fail(400, { message: 'ID dan Nama kategori harus diisi' });
		}

		const order = orderStr ? parseInt(orderStr, 10) : 0;

		try {
			const oldData = await db.query.itemCategory.findFirst({
				where: eq(itemCategory.id, id)
			});

			if (!oldData) {
				return fail(404, { message: 'Kategori tidak ditemukan' });
			}

			// Prevent cyclic hierarchy
			if (parentId === id) {
				return fail(400, { message: 'Kategori tidak boleh menjadi induk dari dirinya sendiri' });
			}

			await db.transaction(async (tx) => {
				await tx
					.update(itemCategory)
					.set({
						name,
						parentId,
						order
					})
					.where(eq(itemCategory.id, id));

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'UPDATE_ITEM_CATEGORY',
					tableName: 'item_category',
					recordId: id,
					oldValue: JSON.stringify({
						name: oldData.name,
						parentId: oldData.parentId,
						order: oldData.order
					}),
					newValue: JSON.stringify({ name, parentId, order })
				});
			});

			// Invalidate all category lists in cache
			await invalidateCachePattern('category:list:*');

			return { success: true, message: 'Kategori berhasil diperbarui' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal memperbarui kategori' });
		}
	},

	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401, { message: 'Unauthorized' });

		const isCentral = user.organization?.parentId === null;
		const isSuperAdmin = user.role === 'superadmin';
		const canDelete = isCentral && isSuperAdmin;

		if (!canDelete) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString().trim();

		if (!id) {
			return fail(400, { message: 'ID kategori harus diisi' });
		}

		try {
			const oldData = await db.query.itemCategory.findFirst({
				where: eq(itemCategory.id, id)
			});

			if (!oldData) {
				return fail(404, { message: 'Kategori tidak ditemukan' });
			}

			// Check if this category has subcategories
			const hasChildren = await db.query.itemCategory.findFirst({
				where: eq(itemCategory.parentId, id)
			});
			if (hasChildren) {
				return fail(400, { message: 'Kategori tidak dapat dihapus karena memiliki subkategori' });
			}

			await db.transaction(async (tx) => {
				await tx.delete(itemCategory).where(eq(itemCategory.id, id));

				await tx.insert(auditLog).values({
					id: uuidv4(),
					userId: user.id,
					action: 'DELETE_ITEM_CATEGORY',
					tableName: 'item_category',
					recordId: id,
					oldValue: JSON.stringify({
						name: oldData.name,
						parentId: oldData.parentId,
						order: oldData.order
					})
				});
			});

			// Invalidate all category lists in cache
			await invalidateCachePattern('category:list:*');

			return { success: true, message: 'Kategori berhasil dihapus' };
		} catch (err: any) {
			console.error(err);
			if (
				err.errno === 1451 ||
				(err.message && err.message.toLowerCase().includes('foreign key'))
			) {
				return fail(400, {
					message: 'Kategori tidak dapat dihapus karena sedang digunakan oleh data materiil/alat'
				});
			}
			return fail(500, { message: 'Gagal menghapus kategori' });
		}
	}
};
