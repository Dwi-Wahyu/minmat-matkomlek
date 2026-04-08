import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { building, organization } from '$lib/server/db/schema';
import { eq, and, like, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { uploadFile } from '$lib/server/storage';

// GET: List all building for an organization
export const GET: RequestHandler = async ({ params, url }) => {
	const { org_slug } = params;
	const searchQuery = url.searchParams.get('q') || '';

	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		return json({ message: 'Organization not found' }, { status: 404 });
	}

	const filters = [eq(building.organizationId, org.id)];

	if (searchQuery) {
		filters.push(
			sql`(${like(building.code, `%${searchQuery}%`)} OR ${like(building.name, `%${searchQuery}%`)} OR ${like(building.location, `%${searchQuery}%`)})`
		);
	}

	const buildings = await db.query.building.findMany({
		where: and(...filters),
		orderBy: (building, { desc }) => [desc(building.createdAt)]
	});

	return json(buildings);
};

// POST: Create a new building record (Multipart/form-data for image)
export const POST: RequestHandler = async ({ params, request }) => {
	const { org_slug } = params;
	
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		return json({ message: 'Organization not found' }, { status: 404 });
	}

	const formData = await request.formData();
	
	const code = formData.get('code') as string;
	const name = formData.get('name') as string;
	const location = formData.get('location') as string;
	const type = formData.get('type') as string;
	const area = formData.get('area') as string;
	const condition = formData.get('condition') as 'BAIK' | 'RUSAK';
	const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
	const description = formData.get('description') as string;
	const latitude = formData.get('latitude') as string;
	const longitude = formData.get('longitude') as string;
	const imageFile = formData.get('image') as File;

	if (!code || !name || !location || !type || !area || !condition || !status) {
		return json({ message: 'All required fields must be filled' }, { status: 400 });
	}

	// Upload image if exists
	const { fileName, error: uploadError } = await uploadFile(imageFile, 'building');
	if (uploadError) {
		return json({ message: uploadError }, { status: 400 });
	}

	try {
		const id = crypto.randomUUID();
		await db.insert(building).values({
			id,
			organizationId: org.id,
			code,
			name,
			location,
			type,
			area,
			condition,
			status,
			description,
			latitude: latitude ? latitude : null,
			longitude: longitude ? longitude : null,
			photoPath: fileName
		});

		const newBuilding = await db.query.building.findFirst({
			where: eq(building.id, id)
		});

		return json(newBuilding, { status: 201 });
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to create building record' }, { status: 500 });
	}
};
