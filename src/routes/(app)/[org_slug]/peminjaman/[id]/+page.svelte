<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';

	let { data } = $props();

	// State untuk notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State untuk reject dialog
	let showRejectDialog = $state(false);
	let rejectNote = $state('');
	let rejectForm: HTMLFormElement | null = $state(null);

	// State untuk start lending dialog
	let showStartDialog = $state(false);
	let startForm: HTMLFormElement | null = $state(null);

	// State untuk return dialog
	let showReturnDialog = $state(false);
	let returnForm: HTMLFormElement | null = $state(null);

	// Helper untuk status badge
	function getStatusBadge(status: string) {
		const variants: Record<string, { class: string; label: string }> = {
			DRAFT: { class: 'bg-gray-100 text-gray-800', label: 'Draft' },
			APPROVED: { class: 'bg-green-100 text-green-800', label: 'Disetujui' },
			REJECTED: { class: 'bg-red-100 text-red-800', label: 'Ditolak' },
			DIPINJAM: { class: 'bg-blue-100 text-blue-800', label: 'Dipinjam' },
			KEMBALI: { class: 'bg-purple-100 text-purple-800', label: 'Kembali' }
		};
		return variants[status] || variants.DRAFT;
	}

	// Helper untuk condition badge
	function getConditionBadge(condition: string) {
		const variants: Record<string, string> = {
			BAIK: 'bg-green-100 text-green-800',
			RUSAK_RINGAN: 'bg-yellow-100 text-yellow-800',
			RUSAK_BERAT: 'bg-red-100 text-red-800'
		};
		return variants[condition] || 'bg-gray-100 text-gray-800';
	}

	// Helper untuk format tanggal
	function formatDate(date: Date | string | null): string {
		if (!date) return '-';
		return new Date(date).toLocaleString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
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
		if (notificationType === 'success') {
			// Refresh data
			invalidateAll();
			// Jika action yang dilakukan adalah approve/reject/start/return, tetap di halaman detail
			// Jika delete, redirect ke list (handle di form delete)
		}
	}

	// Handler untuk approve
	function handleApprove(form: HTMLFormElement) {
		if (confirm('Setujui peminjaman ini?')) {
			form.requestSubmit();
		}
	}

	// Handler untuk reject dialog
	function openRejectDialog(form: HTMLFormElement) {
		rejectForm = form;
		showRejectDialog = true;
	}

	function handleReject() {
		if (rejectForm) {
			rejectForm.requestSubmit();
		}
		showRejectDialog = false;
		rejectNote = '';
	}

	function handleCancelReject() {
		showRejectDialog = false;
		rejectNote = '';
	}

	// Handler untuk start lending dialog
	function openStartDialog(form: HTMLFormElement) {
		startForm = form;
		showStartDialog = true;
	}

	function handleStart() {
		if (startForm) {
			startForm.requestSubmit();
		}
		showStartDialog = false;
	}

	function handleCancelStart() {
		showStartDialog = false;
	}

	// Handler untuk return dialog
	function openReturnDialog(form: HTMLFormElement) {
		returnForm = form;
		showReturnDialog = true;
	}

	function handleReturn() {
		if (returnForm) {
			returnForm.requestSubmit();
		}
		showReturnDialog = false;
	}

	function handleCancelReturn() {
		showReturnDialog = false;
	}

	// Cek apakah user adalah pemohon
	const isRequester = $derived(data.lending.requestedBy === data.userId);
	
	// Cek apakah user dari organisasi induk
	const isParentOrg = $derived(data.lending.organization?.parentId === null);
</script>

<svelte:head>
	<title>Detail Peminjaman</title>
</svelte:head>

<div class="container mx-auto max-w-6xl py-6">
	<!-- Header dengan breadcrumb -->
	<div class="mb-4">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<a href={`/${data.orgSlug}/peminjaman`} class="hover:underline">Peminjaman</a>
			<span>/</span>
			<span>Detail</span>
		</div>
	</div>

	<div class="mb-6 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold">Detail Peminjaman</h1>
			<Badge class={getStatusBadge(data.lending.status).class}>
				{getStatusBadge(data.lending.status).label}
			</Badge>
		</div>
		<div class="flex gap-2">
			{#if data.lending.status === 'DRAFT' && isRequester}
				<Button variant="outline" href={`/${data.orgSlug}/peminjaman/${data.lending.id}/edit`}>
					Edit
				</Button>
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showSuccessNotification('Data peminjaman berhasil dihapus');
								setTimeout(() => goto(`/${data.orgSlug}/peminjaman`), 1500);
							} else if (result.type === 'failure') {
								showErrorNotification(result.data?.message || 'Gagal menghapus data');
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={data.lending.id} />
					<Button 
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
			<Button variant="outline" href={`/${data.orgSlug}/peminjaman`}>Kembali</Button>
		</div>
	</div>

	<!-- Main Content dengan Tabs -->
	<Tabs defaultValue="detail" class="space-y-4">
		<TabsList>
			<TabsTrigger value="detail">Detail Peminjaman</TabsTrigger>
			<TabsTrigger value="items">Daftar Alat</TabsTrigger>
			<TabsTrigger value="approval">Riwayat Persetujuan</TabsTrigger>
		</TabsList>

		<!-- Tab Detail -->
		<TabsContent value="detail">
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Informasi Umum -->
				<Card>
					<CardHeader>
						<CardTitle>Informasi Umum</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">ID</span>
							<span class="col-span-2 font-mono text-sm">{data.lending.id}</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Unit/Divisi</span>
							<span class="col-span-2">{data.lending.unit}</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Tujuan</span>
							<span class="col-span-2">
								<Badge class={data.lending.purpose === 'OPERASI' 
									? 'bg-orange-100 text-orange-800' 
									: 'bg-yellow-100 text-yellow-800'}>
									{data.lending.purpose}
								</Badge>
							</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Organisasi</span>
							<span class="col-span-2">{data.lending.organization?.name}</span>
						</div>
					</CardContent>
				</Card>

				<!-- Informasi Waktu -->
				<Card>
					<CardHeader>
						<CardTitle>Informasi Waktu</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Tanggal Mulai</span>
							<span class="col-span-2">{formatDate(data.lending.startDate)}</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Tanggal Selesai</span>
							<span class="col-span-2">{formatDate(data.lending.endDate)}</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Dibuat Pada</span>
							<span class="col-span-2">{formatDate(data.lending.createdAt)}</span>
						</div>
						{#if data.lending.updatedAt}
							<div class="grid grid-cols-3 gap-2">
								<span class="text-sm font-medium text-muted-foreground">Diupdate Pada</span>
								<span class="col-span-2">{formatDate(data.lending.updatedAt)}</span>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Informasi Pemohon -->
				<Card>
					<CardHeader>
						<CardTitle>Pemohon</CardTitle>
					</CardHeader>
					<CardContent class="space-y-3">
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Nama</span>
							<span class="col-span-2">{data.lending.requestedByUser?.name || '-'}</span>
						</div>
						<div class="grid grid-cols-3 gap-2">
							<span class="text-sm font-medium text-muted-foreground">Email</span>
							<span class="col-span-2">{data.lending.requestedByUser?.email || '-'}</span>
						</div>
					</CardContent>
				</Card>

				<!-- Informasi Persetujuan (jika sudah di-approve) -->
				{#if data.lending.approvedByUser}
					<Card>
						<CardHeader>
							<CardTitle>Pemberi Persetujuan</CardTitle>
						</CardHeader>
						<CardContent class="space-y-3">
							<div class="grid grid-cols-3 gap-2">
								<span class="text-sm font-medium text-muted-foreground">Nama</span>
								<span class="col-span-2">{data.lending.approvedByUser?.name || '-'}</span>
							</div>
							<div class="grid grid-cols-3 gap-2">
								<span class="text-sm font-medium text-muted-foreground">Status</span>
								<span class="col-span-2">
									<Badge class={data.lending.status === 'APPROVED' 
										? 'bg-green-100 text-green-800' 
										: 'bg-red-100 text-red-800'}>
										{data.lending.status === 'APPROVED' ? 'Disetujui' : 'Ditolak'}
									</Badge>
								</span>
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		</TabsContent>

		<!-- Tab Daftar Alat -->
		<TabsContent value="items">
			<Card>
				<CardHeader>
					<CardTitle>Daftar Alat yang Dipinjam</CardTitle>
					<CardDescription>
						Total {data.lending.items?.length || 0} item
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nama Alat</TableHead>
								<TableHead>Serial Number</TableHead>
								<TableHead>Tipe</TableHead>
								<TableHead>Merk</TableHead>
								<TableHead>Kondisi</TableHead>
								<TableHead>Lokasi</TableHead>
								<TableHead class="text-right">Jumlah</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.lending.items || [] as item}
								<TableRow>
									<TableCell class="font-medium">
										{item.equipment?.name}
										{item.equipment?.item && <span class="text-xs text-muted-foreground"> ({item.equipment.item.name})</span>}
									</TableCell>
									<TableCell class="font-mono text-xs">{item.equipment?.serialNumber || '-'}</TableCell>
									<TableCell>{item.equipment?.type || '-'}</TableCell>
									<TableCell>{item.equipment?.brand || '-'}</TableCell>
									<TableCell>
										<Badge class={getConditionBadge(item.equipment?.condition)}>
											{item.equipment?.condition?.replace('_', ' ') || '-'}
										</Badge>
									</TableCell>
									<TableCell>{item.equipment?.warehouse?.name || '-'}</TableCell>
									<TableCell class="text-right">{item.qty}</TableCell>
								</TableRow>
							{:else}
								<TableRow>
									<TableCell colspan="7" class="text-center">
										Tidak ada alat dalam peminjaman ini
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</TabsContent>

		<!-- Tab Riwayat Persetujuan -->
		<TabsContent value="approval">
			<Card>
				<CardHeader>
					<CardTitle>Riwayat Persetujuan</CardTitle>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						{#each data.lending.approvals || [] as approval}
							<div class="flex items-start gap-4 rounded-lg border p-4">
								<div class="flex h-8 w-8 items-center justify-center rounded-full 
									{approval.status === 'APPROVED' ? 'bg-green-100' : 
									 approval.status === 'REJECTED' ? 'bg-red-100' : 'bg-gray-100'}">
									{#if approval.status === 'APPROVED'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
										</svg>
									{:else if approval.status === 'REJECTED'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-600" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
										</svg>
									{/if}
								</div>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<div>
											<span class="font-medium">{approval.approvedByUser?.name || 'System'}</span>
											<span class="ml-2 text-sm text-muted-foreground">
												{approval.status === 'APPROVED' ? 'menyetujui' : 
												 approval.status === 'REJECTED' ? 'menolak' : 'pending'}
											</span>
										</div>
										<span class="text-sm text-muted-foreground">
											{formatDate(approval.createdAt)}
										</span>
									</div>
									{#if approval.note}
										<p class="mt-1 text-sm text-muted-foreground">
											Catatan: {approval.note}
										</p>
									{/if}
								</div>
							</div>
						{:else}
							<p class="text-center text-muted-foreground">Belum ada riwayat persetujuan</p>
						{/each}
					</div>
				</CardContent>
			</Card>
		</TabsContent>
	</Tabs>

	<!-- Action Buttons (untuk approve/reject/start/return) -->
	{#if data.canApprove || data.lending.status === 'APPROVED' || data.lending.status === 'DIPINJAM'}
		<Separator class="my-6" />
		
		<div class="flex justify-end gap-2">
			<!-- Approve/Reject untuk parent organization -->
			{#if data.canApprove}
				<!-- Form Approve -->
				<form
					method="POST"
					action="?/approve"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showSuccessNotification('Peminjaman berhasil disetujui');
								invalidateAll();
							} else if (result.type === 'failure') {
								showErrorNotification(result.data?.message || 'Gagal menyetujui');
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={data.lending.id} />
					<Button 
						type="button" 
						variant="default"
						class="bg-green-600 hover:bg-green-700"
						onclick={(e) => {
							const form = e.currentTarget.closest('form');
							if (form) handleApprove(form);
						}}
					>
						Setujui
					</Button>
				</form>

				<!-- Form Reject -->
				<form
					method="POST"
					action="?/reject"
					bind:this={rejectForm}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showSuccessNotification('Peminjaman ditolak');
								invalidateAll();
							} else if (result.type === 'failure') {
								showErrorNotification(result.data?.message || 'Gagal menolak');
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={data.lending.id} />
					<input type="hidden" name="note" value={rejectNote} />
					<Button 
						type="button" 
						variant="destructive"
						onclick={() => openRejectDialog(rejectForm!)}
					>
						Tolak
					</Button>
				</form>
			{/if}

			<!-- Start Lending (setelah disetujui) -->
			{#if data.lending.status === 'APPROVED'}
				<form
					method="POST"
					action="?/startLending"
					bind:this={startForm}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showSuccessNotification('Barang telah dipinjam');
								invalidateAll();
							} else if (result.type === 'failure') {
								showErrorNotification(result.data?.message || 'Gagal memulai peminjaman');
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={data.lending.id} />
					<Button 
						type="button" 
						variant="default"
						class="bg-blue-600 hover:bg-blue-700"
						onclick={() => openStartDialog(startForm!)}
					>
						Barang Diambil
					</Button>
				</form>
			{/if}

			<!-- Return Lending (setelah dipinjam) -->
			{#if data.lending.status === 'DIPINJAM'}
				<form
					method="POST"
					action="?/returnLending"
					bind:this={returnForm}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								showSuccessNotification('Barang telah dikembalikan');
								invalidateAll();
							} else if (result.type === 'failure') {
								showErrorNotification(result.data?.message || 'Gagal mengembalikan barang');
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={data.lending.id} />
					<Button 
						type="button" 
						variant="default"
						class="bg-purple-600 hover:bg-purple-700"
						onclick={() => openReturnDialog(returnForm!)}
					>
						Barang Dikembalikan
					</Button>
				</form>
			{/if}
		</div>
	{/if}

	<!-- Dialog Konfirmasi Reject -->
	<ConfirmationDialog
		bind:open={showRejectDialog}
		type="error"
		title="Tolak Peminjaman"
		description="Apakah Anda yakin ingin menolak peminjaman ini?"
		cancelLabel="Batal"
		actionLabel="Tolak"
		onAction={handleReject}
		onCancel={handleCancelReject}
	>
		<div class="mt-4">
			<Label for="rejectNote">Alasan Penolakan</Label>
			<Textarea
				id="rejectNote"
				bind:value={rejectNote}
				placeholder="Masukkan alasan penolakan..."
				rows={3}
				class="mt-2"
				required
			/>
		</div>
	</ConfirmationDialog>

	<!-- Dialog Konfirmasi Start Lending -->
	<ConfirmationDialog
		bind:open={showStartDialog}
		type="info"
		title="Konfirmasi Pengambilan Barang"
		description="Apakah Anda yakin barang-barang ini sudah diambil oleh peminjam?"
		cancelLabel="Batal"
		actionLabel="Ya, Sudah Diambil"
		onAction={handleStart}
		onCancel={handleCancelStart}
	/>

	<!-- Dialog Konfirmasi Return Lending -->
	<ConfirmationDialog
		bind:open={showReturnDialog}
		type="info"
		title="Konfirmasi Pengembalian Barang"
		description="Apakah Anda yakin semua barang telah dikembalikan dalam kondisi baik?"
		cancelLabel="Batal"
		actionLabel="Ya, Sudah Dikembalikan"
		onAction={handleReturn}
		onCancel={handleCancelReturn}
	/>

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