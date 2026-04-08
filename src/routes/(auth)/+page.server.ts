import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return redirect(302, `${locals.user.organization.slug}/dashboard`);
	}

	return { user: locals.user };
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInUsername({
				body: {
					username,
					password,
					callbackURL: '/dashboard'
				},
				asResponse: true
			});
		} catch (error) {
			console.log(error);

			if (error instanceof APIError) {
				return fail(400, { message: error.message || 'Signin failed' });
			}

			return fail(500, { message: 'Unexpected error' });
		}

		const userResult = await db.query.user.findFirst({
			where: (user, { eq }) => eq(user.username, username),
			with: {
				members: {
					with: {
						organization: true
					}
				}
			}
		});

		if (!userResult) return fail(400, { message: 'User tidak ditemukan' });

		return redirect(302, `${userResult.members[0].organization?.slug}/dashboard`);
	}
};
