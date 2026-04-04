import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, extname } from 'path';

const UPLOAD_ROOT = 'static/uploads';

export async function uploadFile(
	file: File | null,
	subfolder: string,
	allowedExtensions: string[] = ['.jpg', '.jpeg', '.png'],
	maxSize: number = 5 * 1024 * 1024 // 5MB
): Promise<{ fileName: string | null; error?: string }> {
	if (!file || file.size === 0) return { fileName: null };

	if (file.size > maxSize) {
		return { fileName: null, error: `Ukuran file maksimal adalah ${maxSize / (1024 * 1024)}MB` };
	}

	const extension = extname(file.name).toLowerCase();
	if (!allowedExtensions.includes(extension)) {
		return { fileName: null, error: `Ekstensi file ${extension} tidak diizinkan. Gunakan ${allowedExtensions.join(', ')}` };
	}

	const fileName = `${crypto.randomUUID()}${extension}`;
	const uploadDir = join(UPLOAD_ROOT, subfolder);
	const filePath = join(uploadDir, fileName);

	try {
		if (!existsSync(uploadDir)) {
			mkdirSync(uploadDir, { recursive: true });
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		writeFileSync(filePath, buffer);

		return { fileName };
	} catch (error) {
		console.error('Error uploading file:', error);
		return { fileName: null, error: 'Gagal mengunggah file' };
	}
}

export function deleteFile(fileName: string | null, subfolder: string) {
	if (!fileName) return;
	
	const fsPath = join(UPLOAD_ROOT, subfolder, fileName);
	
	try {
		if (existsSync(fsPath)) {
			unlinkSync(fsPath);
		}
	} catch (error) {
		console.error('Error deleting file:', error);
	}
}
