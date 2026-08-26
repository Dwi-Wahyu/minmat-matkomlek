import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const load: import('./$types').PageServerLoad = async (event) => {
	await auth.api.signOut({
		headers: event.request.headers
	});

	throw redirect(302, '/');
};
