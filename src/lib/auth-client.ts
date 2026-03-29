import { createAuthClient } from 'better-auth/svelte';
import {
	customSessionClient,
	organizationClient,
	usernameClient
} from 'better-auth/client/plugins';
import { apiKeyClient } from '@better-auth/api-key/client';
import type { auth } from '$lib/server/auth';

export const authClient = createAuthClient({
	plugins: [
		apiKeyClient(),
		usernameClient(),
		organizationClient(),
		customSessionClient<typeof auth>()
	]
});
