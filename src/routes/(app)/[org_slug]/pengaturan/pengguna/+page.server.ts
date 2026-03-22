import { db } from '$lib/server/db';
import { member, user } from '$lib/server/db/auth.schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUser = locals.user;

	if (!currentUser) {
		throw redirect(302, '/login');
	}

	// Cek role superadmin
	if (currentUser.role !== 'superadmin') {
		throw error(403, 'Anda tidak memiliki akses ke halaman ini.');
	}

	const orgId = currentUser.organization?.id;

	if (!orgId) {
		throw error(400, 'Organisasi tidak ditemukan pada sesi Anda.');
	}

	// Ambil daftar user yang tergabung dalam organisasi yang sama
	const members = await db.query.member.findMany({
		where: eq(member.organizationId, orgId),
		with: {
			user: true
		}
	});

	// Filter out global.superadmin@gmail.com and own user
	const filteredMembers = members.filter((m) => {
		return m.user.email !== 'global.superadmin@gmail.com' && m.userId !== currentUser.id;
	});

	return {
		members: filteredMembers,
		orgSlug: params.org_slug
	};
};
