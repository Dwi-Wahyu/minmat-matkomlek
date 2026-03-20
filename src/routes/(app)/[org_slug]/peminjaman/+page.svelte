<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	// State untuk notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// Helper untuk status badge
	function getStatusBadge(status: string | null) {
		const variants: Record<string, { class: string; label: string }> = {
			DRAFT: { class: 'bg-gray-100 text-gray-800', label: 'Draft' },
			APPROVED: { class: 'bg-green-100 text-green-800', label: 'Disetujui' },
			DIPINJAM: { class: 'bg-blue-100 text-blue-800', label: 'Dipinjam' },
			KEMBALI: { class: 'bg-purple-100 text-purple-800', label: 'Kembali' },
			REJECTED: { class: 'bg-red-100 text-red-800', label: 'Ditolak' }
		};

		if (!status) {
			return variants.DRAFT;
		}

		return variants[status] || variants.DRAFT;
	}

	// Helper untuk purpose badge
	function getPurposeBadge(purpose: string) {
		return purpose === 'OPERASI'
			? 'bg-orange-100 text-orange-800'
			: 'bg-yellow-100 text-yellow-800';
	}

	// Handler untuk notifikasi
	function showSuccessNotification(message: string) {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = message;
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message;
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function handleNotificationAction() {
		showNotification = false;
	}
</script>

<svelte:head>
	<title>Peminjaman Alat</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Peminjaman Alat</h1>
			<p class="text-sm text-muted-foreground">
				{data.isParentOrg
					? 'Semua peminjaman dari organisasi dan cabang'
					: 'Peminjaman organisasi Anda'}
			</p>
		</div>
		<Button href={`/${data.orgSlug}/peminjaman/create`}>Ajukan Peminjaman</Button>
	</div>

	<!-- Tabel Data Peminjaman -->
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>No. Peminjaman</TableHead>
				<TableHead>Unit</TableHead>
				<TableHead>Tujuan</TableHead>
				<TableHead>Tanggal Mulai</TableHead>
				<TableHead>Tanggal Selesai</TableHead>
				<TableHead>Status</TableHead>
				<TableHead>Pemohon</TableHead>
				{#if data.isParentOrg}
					<TableHead>Organisasi</TableHead>
				{/if}
				<TableHead>Jumlah Item</TableHead>
				<TableHead class="text-right">Aksi</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each data.lending as item}
				<TableRow>
					<TableCell class="font-mono text-xs">
						{item.id.slice(0, 8)}...
					</TableCell>
					<TableCell>{item.unit}</TableCell>
					<TableCell>
						<Badge class={getPurposeBadge(item.purpose)}>
							{item.purpose}
						</Badge>
					</TableCell>
					<TableCell>{new Date(item.startDate).toLocaleDateString('id-ID')}</TableCell>
					<TableCell>
						{item.endDate ? new Date(item.endDate).toLocaleDateString('id-ID') : '-'}
					</TableCell>
					<TableCell>
						<Badge class={getStatusBadge(item.status).class}>
							{getStatusBadge(item.status).label}
						</Badge>
					</TableCell>
					<TableCell>{item.requestedByUser?.name || '-'}</TableCell>
					{#if data.isParentOrg}
						<TableCell>{item.organization?.name || '-'}</TableCell>
					{/if}
					<TableCell>{item.items?.length || 0}</TableCell>
					<TableCell class="text-right">
						<div class="flex justify-end gap-2">
							<Button size="sm" variant="outline" href={`/${data.orgSlug}/peminjaman/${item.id}`}>
								Detail
							</Button>

							{#if item.status === 'DRAFT' && !data.isParentOrg}
								<Button
									size="sm"
									variant="outline"
									href={`/${data.orgSlug}/peminjaman/${item.id}/edit`}
								>
									Edit
								</Button>

								<form
									method="POST"
									action="?/delete"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') {
												await invalidateAll();
												showSuccessNotification('Data peminjaman berhasil dihapus');
											} else if (result.type === 'failure') {
												showErrorNotification(result.data?.message || 'Gagal menghapus data');
											}
											await update();
										};
									}}
								>
									<input type="hidden" name="id" value={item.id} />
									<Button
										size="sm"
										variant="destructive"
										type="submit"
										onclick={(e) => {
											if (!confirm('Apakah Anda yakin ingin menghapus peminjaman ini?')) {
												e.preventDefault();
											}
										}}
									>
										Hapus
									</Button>
								</form>
							{/if}
						</div>
					</TableCell>
				</TableRow>
			{:else}
				<TableRow>
					<TableCell colspan={data.isParentOrg ? 10 : 9} class="text-center">
						Belum ada data peminjaman
					</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={showNotification}
		type={notificationType}
		title={notificationTitle}
		description={notificationDescription}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>
</div>
