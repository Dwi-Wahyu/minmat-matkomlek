// Label mapping untuk enum yang berkaitan dengan Maintenance (Perawatan)

export const maintenanceTypeLabel: Record<string, string> = {
	PERAWATAN: 'Perawatan Rutin',
	PERBAIKAN: 'Perbaikan'
};

export const maintenanceStatusLabel: Record<string, string> = {
	PENDING: 'Menunggu',
	IN_PROGRESS: 'Sedang Dikerjakan',
	COMPLETED: 'Selesai'
};
