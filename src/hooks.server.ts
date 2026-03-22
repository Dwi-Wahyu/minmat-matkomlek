import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// 1. Dapatkan session dari Better Auth
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = undefined; // Default awal

		try {
			// 2. Ambil data tambahan (organisasi & role) dari DB
			const userWithOrgs = await db.query.user.findFirst({
				where: (user, { eq }) => eq(user.id, session.user.id),
				with: {
					members: {
						with: {
							organization: true
						}
					}
				}
			});

			// 3. Jika user punya membership, set data lengkap ke locals.user
			if (userWithOrgs && userWithOrgs.members && userWithOrgs.members.length > 0) {
				const firstMember = userWithOrgs.members[0];
				
				if (firstMember && firstMember.organization) {
					event.locals.user = {
						...session.user,
						role: firstMember.role,
						organization: {
							id: firstMember.organization.id,
							parentId: firstMember.organization.parentId,
							logo: firstMember.organization.logo ?? '',
							slug: firstMember.organization.slug,
							name: firstMember.organization.name
						}
					};
				} else {
					// User ada tapi organisasi atau member entry tidak valid
					event.locals.user = { ...session.user, role: 'user', organization: null } as any;
				}
			} else if (userWithOrgs) {
				// User ada tapi belum punya organisasi sama sekali
				event.locals.user = { ...session.user, role: 'user', organization: null } as any;
			}
		} catch (dbError) {
			console.error('Error fetching user organization in hook:', dbError);
			// Jika DB error, kita tetap biarkan user login sebagai user dasar agar tidak 500
			event.locals.user = { ...session.user, role: 'user', organization: null } as any;
		}
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
