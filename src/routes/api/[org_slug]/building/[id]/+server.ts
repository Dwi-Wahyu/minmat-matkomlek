import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { building, organization } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { uploadFile, deleteFile } from '$lib/server/storage';

// GET: Single building details
export const GET: RequestHandler = async ({ params }) => {
	const { org_slug, id } = params;

	const buildingRecord = await db.query.building.findFirst({
		where: eq(building.id, id),
		with: {
			organization: true
		}
	});

	if (!buildingRecord) {
		return json({ message: 'Building record not found' }, { status: 404 });
	}

	return json(buildingRecord);
};

// PATCH: Update building record
export const PATCH: RequestHandler = async ({ params, request }) => {
	const { id } = params;
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

	// Check if building exists
	const existingBuilding = await db.query.building.findFirst({
		where: eq(building.id, id)
	});

	if (!existingBuilding) {
		return json({ message: 'Building record not found' }, { status: 404 });
	}

	// Upload new image if exists
	let fileName = existingBuilding.photoPath;
	if (imageFile && imageFile.size > 0) {
		const { fileName: newFileName, error: uploadError } = await uploadFile(imageFile, 'building');
		if (uploadError) return json({ message: uploadError }, { status: 400 });
		
		// Delete old file if new one uploaded
		if (existingBuilding.photoPath) {
			deleteFile(existingBuilding.photoPath, 'building');
		}
		fileName = newFileName;
	}

	try {
		await db.update(building)
			.set({
				code: code ?? existingBuilding.code,
				name: name ?? existingBuilding.name,
				location: location ?? existingBuilding.location,
				type: type ?? existingBuilding.type,
				area: area ?? existingBuilding.area,
				condition: condition ?? existingBuilding.condition,
				status: status ?? existingBuilding.status,
				description: description ?? existingBuilding.description,
				latitude: latitude ? latitude : existingBuilding.latitude,
				longitude: longitude ? longitude : existingBuilding.longitude,
				photoPath: fileName,
				updatedAt: new Date()
			})
			.where(eq(building.id, id));

		const updatedBuilding = await db.query.building.findFirst({
			where: eq(building.id, id)
		});

		return json(updatedBuilding);
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to update building record' }, { status: 500 });
	}
};

// DELETE: Remove building record
export const DELETE: RequestHandler = async ({ params }) => {
	const { id } = params;

	const existingBuilding = await db.query.building.findFirst({
		where: eq(building.id, id)
	});

	if (!existingBuilding) {
		return json({ message: 'Building record not found' }, { status: 404 });
	}

	try {
		if (existingBuilding.photoPath) {
			deleteFile(existingBuilding.photoPath, 'building');
		}

		await db.delete(building).where(eq(building.id, id));
		return json({ success: true, message: 'Building record deleted' });
	} catch (error) {
		console.error(error);
		return json({ message: 'Failed to delete building record' }, { status: 500 });
	}
};
