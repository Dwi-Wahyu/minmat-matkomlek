import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = locals;

	if (!user) {
		throw redirect(302, '/');
	}

	// Cari organisasi induk berdasarkan slug di URL
	const currentOrg = await db.query.organization.findFirst({
		where: eq(organization.slug, user.organization.slug)
	});

	if (!currentOrg) {
		throw error(404, 'Organisasi tidak ditemukan');
	}

	// Ambil semua satuan jajaran (anak dari currentOrg.id)
	const units = await db.query.organization.findMany({
		where: eq(organization.parentId, currentOrg.id),
		orderBy: [asc(organization.name)]
	});

	return {
		units,
		currentOrg
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const displayName = formData.get('displayName') as string;

		if (!name) {
			return fail(400, { message: 'Nama Satuan Jajaran wajib diisi' });
		}

		// Cari organisasi induk
		const currentOrg = await db.query.organization.findFirst({
			where: eq(organization.slug, user.organization.slug)
		});

		if (!currentOrg) {
			return fail(404, { message: 'Organisasi aktif tidak ditemukan' });
		}

		try {
			const randomSuffix = crypto.randomUUID().slice(0, 8);
			const slug =
				name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/(^-|-$)/g, '') +
				'-' +
				randomSuffix;

			await db.insert(organization).values({
				id: crypto.randomUUID(),
				name,
				displayName: displayName || name,
				slug,
				parentId: currentOrg.id,
				createdAt: new Date()
			});

			return { success: true, message: 'Satuan Jajaran berhasil ditambahkan' };
		} catch (err) {
			console.error('Error creating Satuan Jajaran:', err);
			return fail(500, { message: 'Gagal menambahkan Satuan Jajaran' });
		}
	},

	update: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const displayName = formData.get('displayName') as string;

		if (!id || !name) {
			return fail(400, { message: 'ID dan Nama Satuan Jajaran wajib diisi' });
		}

		try {
			await db
				.update(organization)
				.set({
					name,
					displayName: displayName || name
				})
				.where(eq(organization.id, id));

			return { success: true, message: 'Satuan Jajaran berhasil diperbarui' };
		} catch (err) {
			console.error('Error updating Satuan Jajaran:', err);
			return fail(500, { message: 'Gagal memperbarui Satuan Jajaran' });
		}
	},

	delete: async ({ request, locals }) => {
		const { user } = locals;
		if (!user) return fail(401);

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { message: 'ID Satuan Jajaran diperlukan' });
		}

		try {
			await db.delete(organization).where(eq(organization.id, id));
			return { success: true, message: 'Satuan Jajaran berhasil dihapus' };
		} catch (err) {
			console.error('Error deleting Satuan Jajaran:', err);
			return fail(500, {
				message:
					'Gagal menghapus Satuan Jajaran. Pastikan tidak ada data yang terikat dengan satuan ini.'
			});
		}
	}
};
