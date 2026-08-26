import * as yup from 'yup';

export const barangMutationSchema = yup.object({
	itemId: yup.string().required('Barang harus ditentukan'),
	warehouseId: yup.string().required('Gudang harus dipilih'),
	qty: yup
		.number()
		.typeError('Jumlah harus berupa angka')
		.min(0.0001, 'Jumlah harus lebih dari 0')
		.required('Masukkan jumlah'),
	type: yup
		.string()
		.oneOf(
			['RECEIVE', 'ISSUE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN'],
			'Jenis pergerakan tidak valid'
		)
		.required('Pilih jenis pergerakan'),
	toWarehouseId: yup.string().when('type', {
		is: 'TRANSFER_OUT',
		then: (schema) =>
			schema
				.required('Gudang tujuan harus dipilih')
				.notOneOf([yup.ref('warehouseId')], 'Gudang tujuan tidak boleh sama dengan gudang asal'),
		otherwise: (schema) => schema.nullable().optional()
	}),
	classification: yup
		.string()
		.oneOf(['TRANSITO', 'BALKIR', 'KOMUNITY'], 'Klasifikasi tidak valid')
		.required('Klasifikasi harus dipilih'),
	notes: yup.string().nullable().default('')
});

export type BarangMutationSchema = typeof barangMutationSchema;
