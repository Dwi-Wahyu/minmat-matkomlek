import * as yup from 'yup';

const lendingItemSchema = yup.object({
	equipmentId: yup.string().uuid().required(),
	qty: yup.number().integer().min(1).default(1)
});

export const lendingEditSchema = yup.object({
	unit: yup.string().min(1, 'Unit/Divisi harus diisi').required('Unit/Divisi harus diisi'),
	purpose: yup
		.string()
		.oneOf(['OPERASI', 'LATIHAN', 'PERINTAH_LANGSUNG'], 'Tujuan harus dipilih')
		.required('Tujuan harus dipilih'),
	startDate: yup.string().required('Tanggal mulai tidak valid'),
	endDate: yup.string().nullable().optional(),
	items: yup
		.array()
		.of(lendingItemSchema)
		.min(1, 'Minimal 1 item harus dipilih')
		.required('Minimal 1 item harus dipilih')
});

export type LendingEditSchema = typeof lendingEditSchema;
