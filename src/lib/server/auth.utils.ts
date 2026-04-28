import { error } from '@sveltejs/kit';
import { accessControl, roles } from './auth.roles';

/**
 * Memastikan user sudah login. Jika tidak, lempar error 401.
 */
export function requireAuth(locals: App.Locals) {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized: Silakan login terlebih dahulu');
	}
	return { session: locals.session, user: locals.user };
}

/**
 * Memastikan user memiliki role tertentu. Jika tidak, lempar error 403.
 */
export function requireRole(locals: App.Locals, rolesAllowed: string | string[]) {
	const { user } = requireAuth(locals);

	const allowedRoles = Array.isArray(rolesAllowed) ? rolesAllowed : [rolesAllowed];

	if (!allowedRoles.includes(user.role)) {
		throw error(403, `Forbidden: Anda tidak memiliki akses (${user.role} tidak diizinkan)`);
	}

	return { user };
}

/**
 * Memastikan user memiliki permission tertentu berdasarkan Access Control (RBAC).
 * Contoh: requirePermission(locals, 'inventory', 'create')
 */
export function requirePermission(
	locals: App.Locals,
	resource: keyof typeof accessControl.schema,
	action: string
) {
	const { user } = requireAuth(locals);

	// Ambil objek role dari map, jika tidak ada fallback ke user.role (string)
	const userRole = roles[user.role as keyof typeof roles] || user.role;

	// Cek apakah role user memiliki permission untuk resource dan action tersebut
	const { can } = accessControl.authorize(userRole as any, {
		resource: resource as any,
		action: action as any
	});

	if (!can) {
		throw error(403, `Forbidden: Role ${user.role} tidak memiliki izin ${action} pada ${resource}`);
	}

	return { user };
}
