import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { land, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { uploadFile, deleteFile } from '$lib/server/storage';

// GET: Single land details
export const GET: RequestHandler = async ({ params }) => {
	const { org_slug, id } = params;

	const landRecord = await db.query.land.findFirst({
		where: eq(land.id, id),
		with: {
			organization: true
		}
	});

	if (!landRecord) {
		return json({ message: 'Land record not found' }, { status: 404 });
	}

	return json(landRecord);
};

// PATCH: Update land record
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { id } = params;
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

	// Check if land exists
	const existingLand = await db.query.land.findFirst({
		where: eq(land.id, id)
	});

	if (!existingLand) {
		return json({ message: 'Land record not found' }, { status: 404 });
	}

	// Upload new image if exists
	let fileName = existingLand.photoPath;
	if (imageFile && imageFile.size > 0) {
		const { fileName: newFileName, error: uploadError } = await uploadFile(imageFile, 'land');
		if (uploadError) return json({ message: uploadError }, { status: 400 });
		
		// Delete old file if new one uploaded
		if (existingLand.photoPath) {
			deleteFile(existingLand.photoPath, 'land');
		}
		fileName = newFileName;
	}

	try {
		await db.update(land)
			.set({
				certificateNumber: certificateNumber ?? existingLand.certificateNumber,
				location: location ?? existingLand.location,
				area: area ?? existingLand.area,
				status: status ?? existingLand.status,
				usage: usage ?? existingLand.usage,
				description: description ?? existingLand.description,
				latitude: latitude ? latitude : existingLand.latitude,
				longitude: longitude ? longitude : existingLand.longitude,
				photoPath: fileName,
				updatedAt: new Date()
			})
			.where(eq(land.id, id));

		const updatedLand = await db.query.land.findFirst({
			where: eq(land.id, id)
		});

		return json(updatedLand);
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to update land record' }, { status: 500 });
	}
};

// DELETE: Remove land record
export const DELETE: RequestHandler = async ({ params }) => {
	const { id } = params;

	const existingLand = await db.query.land.findFirst({
		where: eq(land.id, id)
	});

	if (!existingLand) {
		return json({ message: 'Land record not found' }, { status: 404 });
	}

	try {
		if (existingLand.photoPath) {
			deleteFile(existingLand.photoPath, 'land');
		}

		await db.delete(land).where(eq(land.id, id));
		return json({ success: true, message: 'Land record deleted' });
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to delete land record' }, { status: 500 });
	}
};
