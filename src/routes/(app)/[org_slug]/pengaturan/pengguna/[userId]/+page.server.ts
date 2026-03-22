import { db } from '$lib/server/db';
import { session } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, redirect, fail } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const currentUser = locals.user;
	const { userId, org_slug } = params;

	if (!currentUser) throw redirect(302, '/login');

	// Cek role superadmin
	if (currentUser.role !== 'superadmin') {
		throw error(403, 'Anda tidak memiliki akses ke halaman ini.');
	}

	const orgId = currentUser.organization?.id;
	if (!orgId) throw error(400, 'Organisasi tidak ditemukan.');

	// Verifikasi bahwa user yang dicari berada dalam organisasi yang sama
	const memberData = await db.query.member.findFirst({
		where: (member, { eq, and }) =>
			and(eq(member.userId, userId), eq(member.organizationId, orgId)),
		with: {
			user: true
		}
	});

	if (!memberData) {
		throw error(404, 'Pengguna tidak ditemukan di organisasi ini.');
	}

	// Ambil sesi aktif untuk user ini
	const activeSessions = await db.query.session.findMany({
		where: (session, { eq }) => eq(session.userId, userId),
		orderBy: (session, { desc }) => [desc(session.createdAt)]
	});

	// Ambil riwayat login dari audit_log
	const loginHistory = await db.query.auditLog.findMany({
		where: (auditLog, { and, eq }) =>
			and(eq(auditLog.userId, userId), eq(auditLog.action, 'LOGIN')),
		orderBy: (auditLog, { desc }) => [desc(auditLog.createdAt)],
		limit: 20
	});

	return {
		targetUser: memberData.user,
		targetMember: memberData,
		sessions: activeSessions,
		loginHistory: loginHistory.map((log) => ({
			...log,
			data: log.newValue ? JSON.parse(log.newValue) : {}
		})),
		orgSlug: org_slug
	};
};

export const actions: Actions = {
	revokeSession: async ({ request, locals }) => {
		const currentUser = locals.user;
		if (currentUser?.role !== 'superadmin') return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const token = formData.get('token')?.toString();

		if (!token) return fail(400, { message: 'Token tidak ditemukan' });

		try {
			// Superadmin menghapus sesi langsung dari database menggunakan token
			await db.delete(session).where(eq(session.token, token));

			// Jika admin menghapus sesinya sendiri, arahkan ke login
			if (token === locals.session?.token) {
				throw redirect(302, '/login');
			}

			return { success: true, message: 'Sesi berhasil dihapus' };
		} catch (err) {
			if (err instanceof Error && 'status' in err && err.status === 302) throw err;
			console.error('Error revoking session:', err);
			return fail(500, { message: 'Gagal menghapus sesi' });
		}
	},

	changePassword: async ({ request, locals, params }) => {
		const currentUser = locals.user;
		if (currentUser?.role !== 'superadmin') return fail(403, { message: 'Forbidden' });

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!currentPassword || currentPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (!newPassword || newPassword.length < 3) {
			return fail(400, { message: 'Password minimal 3 karakter' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Konfirmasi password tidak cocok' });
		}
		try {
			// Admin password reset (menggunakan plugin admin agar bisa overwrite password lama)
			const result = await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword
				},
				headers: request.headers
			});

			return { success: true, message: 'Password berhasil diubah' };
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Gagal mengubah password' });
		}
	}
};
