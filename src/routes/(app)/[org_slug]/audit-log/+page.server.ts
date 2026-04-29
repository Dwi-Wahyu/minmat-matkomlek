import { db } from '$lib/server/db';
import { auditLog, user } from '$lib/server/db/schema';
import { desc, eq, and, gte, lte, or, ilike } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// 1. Otorisasi: Hanya superadmin yang bisa melihat audit log
	if (!locals.user || !['superadmin', 'kakomlek'].includes(locals.user.role)) {
		throw error(403, 'Forbidden: Akses khusus Superadmin');
	}

	const search = url.searchParams.get('search');
	const startDate = url.searchParams.get('start_date');
	const endDate = url.searchParams.get('end_date');

	const filters = [];

	if (search) {
		filters.push(
			or(ilike(auditLog.action, `%${search}%`), ilike(auditLog.tableName, `%${search}%`))
		);
	}

	if (startDate) {
		filters.push(gte(auditLog.createdAt, new Date(startDate)));
	}

	if (endDate) {
		// Set to end of day if only date is provided
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999);
		filters.push(lte(auditLog.createdAt, end));
	}

	// 2. Ambil data audit log dengan join ke user untuk mendapatkan nama pelaku
	const logs = await db
		.select({
			id: auditLog.id,
			action: auditLog.action,
			tableName: auditLog.tableName,
			recordId: auditLog.recordId,
			oldValue: auditLog.oldValue,
			newValue: auditLog.newValue,
			createdAt: auditLog.createdAt,
			userName: user.name,
			userEmail: user.email
		})
		.from(auditLog)
		.leftJoin(user, eq(auditLog.userId, user.id))
		.where(filters.length > 0 ? and(...filters) : undefined)
		.orderBy(desc(auditLog.createdAt))
		.limit(100);

	return {
		logs,
		filters: {
			search,
			startDate,
			endDate
		}
	};
};
