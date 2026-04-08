import { db } from '$lib/server/db';
import { land, organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { uploadFile } from '$lib/server/storage';

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const { org_slug } = params;
		const formData = await request.formData();

		const certificateNumber = formData.get('certificateNumber') as string;
		const location = formData.get('location') as string;
		const area = formData.get('area') as string;
		const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
		const usage = formData.get('usage') as string;
		const description = formData.get('description') as string;
		const latitude = formData.get('latitude') as string;
		const longitude = formData.get('longitude') as string;
		const imageFile = formData.get('image') as File;

		if (!certificateNumber || !location || !area || !status || !usage) {
			return fail(400, { message: 'Semua field wajib diisi' });
		}

		// Upload image if exists
		const { fileName, error: uploadError } = await uploadFile(imageFile, 'land');
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

			await db.insert(land).values({
				id: crypto.randomUUID(),
				organizationId: orgId,
				certificateNumber,
				location,
				area,
				status,
				usage,
				description,
				latitude: latitude ? latitude : null,
				longitude: longitude ? longitude : null,
				photoPath: fileName
			});

			return { success: true, message: 'Data tanah berhasil ditambahkan' };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Gagal menambahkan data tanah' });
		}
	}
};
