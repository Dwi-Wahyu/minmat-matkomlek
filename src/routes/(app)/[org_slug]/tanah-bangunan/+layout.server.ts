import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.user || !locals.user.organization) {
		throw redirect(302, '/');
	}

	if (locals.user.organization.parentId !== null) {
		throw redirect(302, `/${params.org_slug}/dashboard`);
	}

	return {};
};
