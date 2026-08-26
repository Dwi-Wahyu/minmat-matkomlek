import * as yup from 'yup';

export const itemSchema = yup.object({
	name: yup.string().required('Nama Barang harus diisi'),
	baseUnit: yup
		.string()
		.oneOf(['PCS', 'BOX', 'METER', 'ROLL', 'UNIT'])
		.required('Satuan dasar harus dipilih'),
	description: yup.string().nullable().default(null),
	categoryId: yup.string().optional().default(undefined),
	warehouseId: yup.string().required('Gudang harus dipilih'),
	qty: yup.number().min(0, 'Stok tidak boleh negatif').nullable().default(0),
	image: yup
		.mixed<File>()
		.test('fileSize', 'Ukuran file maksimal 5MB', (value) => {
			if (!value || !(value instanceof File)) return true;
			return value.size <= 5 * 1024 * 1024;
		})
		.test('fileType', 'Format file harus PNG, JPG, atau JPEG', (value) => {
			if (!value || !(value instanceof File)) return true;
			return ['image/png', 'image/jpeg', 'image/jpg'].includes(value.type);
		})
		.nullable()
		.optional()
});

export type ItemSchema = typeof itemSchema;
