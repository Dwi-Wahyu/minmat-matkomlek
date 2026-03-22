import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.user.organization) {
		return redirect(302, '/');
	}

	return {
		user: locals.user
	};
};
