import { db } from '$lib/server/db';
import { building, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { org_slug } = params;
		const formData = await request.formData();

		const code = formData.get('code') as string;
		const name = formData.get('name') as string;
		const location = formData.get('location') as string;
		const type = formData.get('type') as string;
		const area = formData.get('area') as string;
		const condition = formData.get('condition') as 'BAIK' | 'RUSAK';
		const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
		const description = formData.get('description') as string;
		const latitude = formData.get('latitude') as string;
		const longitude = formData.get('longitude') as string;
		const imageFile = formData.get('image') as File;

		if (!code || !name || !location || !type || !area || !condition || !status) {
			return fail(400, { message: 'Field bertanda bintang wajib diisi' });
		}

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'building');
		if (uploadError) return fail(400, { message: uploadError });

		try {
			// Get organization ID
			let orgId = locals.user?.organization.id;
			if (!orgId) {
				const orgResults = await db
					.select()
					.from(organization)
					.where(eq(organization.slug, org_slug))
					.limit(1);
				if (orgResults.length === 0) return fail(404, { message: 'Organisasi tidak ditemukan' });
				orgId = orgResults[0].id;
			}

			await db.insert(building).values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				code,
				name,
				location,
				type,
				area,
				condition,
				status,
				description,
				latitude: latitude ? latitude : null,
				longitude: longitude ? longitude : null,
				photoPath: fileName
			});

			return { success: true, message: 'Data bangunan berhasil ditambahkan' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menambahkan data bangunan' });
		}
	}
};
