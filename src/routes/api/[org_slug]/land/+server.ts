import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { land, organization } from '$lib/server/db/schema';
import { eq, and, like, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { uploadFile } from '$lib/server/storage';

// GET: List all land for an organization
export const GET: RequestHandler = async ({ params, url }) => {
	const { org_slug } = params;
	const searchQuery = url.searchParams.get('q') || '';

	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		return json({ message: 'Organization not found' }, { status: 404 });
	}

	const filters = [eq(land.organizationId, org.id)];

	if (searchQuery) {
		filters.push(
			sql`(${like(land.certificateNumber, `%${searchQuery}%`)} OR ${like(land.location, `%${searchQuery}%`)} OR ${like(land.usage, `%${searchQuery}%`)})`
		);
	}

	const lands = await db.query.land.findMany({
		where: and(...filters),
		orderBy: (land, { desc }) => [desc(land.createdAt)]
	});

	return json(lands);
};

// POST: Create a new land record (Multipart/form-data for image)
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { org_slug } = params;
	
	// Ensure organization exists
	const org = await db.query.organization.findFirst({
		where: eq(organization.slug, org_slug)
	});

	if (!org) {
		return json({ message: 'Organization not found' }, { status: 404 });
	}

	const formData = await request.formData();
	
	const certificateNumber = formData.get('certificateNumber') as string;
	const location = formData.get('location') as string;
	const area = formData.get('area') as string;
	const status = formData.get('status') as 'MILIK_TNI' | 'SEWA';
	const usage = formData.get('usage') as string;
	const description = formData.get('description') as string;
	const latitude = formData.get('latitude') as string;
	const longitude = formData.get('longitude') as string;
	const imageFile = formData.get('image') as File;

	if (!certificateNumber || !location || !area || !status || !usage) {
		return json({ message: 'All required fields must be filled' }, { status: 400 });
	}

	// Upload image if exists
	const { fileName, error: uploadError } = await uploadFile(imageFile, 'land');
	if (uploadError) {
		return json({ message: uploadError }, { status: 400 });
	}

	try {
		const id = crypto.randomUUID();
		await db.insert(land).values({
			id,
			organizationId: org.id,
			certificateNumber,
			location,
			area,
			status,
			usage,
			description,
			latitude: latitude ? latitude : null,
			longitude: longitude ? longitude : null,
			photoPath: fileName
		});

		const newLand = await db.query.land.findFirst({
			where: eq(land.id, id)
		});

		return json(newLand, { status: 201 });
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to create land record' }, { status: 500 });
	}
};
