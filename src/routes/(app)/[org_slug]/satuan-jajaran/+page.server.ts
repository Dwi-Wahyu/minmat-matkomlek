import { db } from '$lib/server/db';
import { organization } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// 1. Cari organisasi induk berdasarkan slug di URL
	const currentOrg = await db.query.organization.findFirst({
		where: eq(organization.slug, params.org_slug)
	});

	if (!currentOrg) {
		throw error(404, 'Organisasi tidak ditemukan');
	}

	// 2. Ambil semua satuan (child organizations) di bawahnya
	// Asumsi: tabel organization memiliki kolom parentId sesuai dokumen konteks
	const units = await db.query.organization.findMany({
		orderBy: (org, { asc }) => [asc(org.name)]
	});

	return {
		units
	};
};
