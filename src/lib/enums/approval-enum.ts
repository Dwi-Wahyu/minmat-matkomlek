// Label mapping untuk enum yang berkaitan dengan Approval (Persetujuan)

export const approvalReferenceTypeLabel: Record<string, string> = {
	LENDING: 'Peminjaman',
	DISTRIBUTION: 'Distribusi',
	MAINTENANCE: 'Perawatan / Perbaikan'
};

export const approvalStatusLabel: Record<string, string> = {
	PENDING: 'Menunggu Persetujuan',
	APPROVED: 'Disetujui',
	REJECTED: 'Ditolak'
};
