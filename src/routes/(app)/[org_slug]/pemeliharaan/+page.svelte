<script lang="ts">
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
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';

	let { data } = $props();

	// State untuk dialog konfirmasi hapus
	let showDeleteDialog = $state(false);
	let deleteId = $state<string | null>(null);
	let deleteForm: HTMLFormElement | null = $state(null);

	// Handler untuk membuka dialog hapus
	function confirmDelete(id: string, formElement: HTMLFormElement) {
		deleteId = id;
		deleteForm = formElement;
		showDeleteDialog = true;
	}

	// Handler untuk aksi hapus
	function handleDelete() {
		if (deleteForm) {
			deleteForm.requestSubmit();
		}
		showDeleteDialog = false;
	}

	// Handler untuk batal hapus
	function handleCancelDelete() {
		deleteId = null;
		deleteForm = null;
		showDeleteDialog = false;
	}
</script>

<svelte:head>
	<title>Pemeliharaan Alat</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Manajemen Pemeliharaan</h1>
		<Button href="pemeliharaan/create">Tambah Pemeliharaan</Button>
	</div>

	<!-- Tabel Data Pemeliharaan -->
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Alat</TableHead>
				<TableHead>Tipe</TableHead>
				<TableHead>Deskripsi</TableHead>
				<TableHead>Jadwal</TableHead>
				<TableHead>Status</TableHead>
				<TableHead>Teknisi</TableHead>
				<TableHead class="text-right">Aksi</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each data.maintenance as item}
				<TableRow>
					<TableCell>
						{item.equipment?.name ?? item.equipmentId}
						{#if item.equipment?.serialNumber}
							<br /><span class="text-xs text-muted-foreground"
								>SN: {item.equipment.serialNumber}</span
							>
						{/if}
					</TableCell>
					<TableCell>{item.maintenanceType}</TableCell>
					<TableCell class="max-w-xs truncate">{item.description}</TableCell>
					<TableCell>{new Date(item.scheduledDate).toLocaleString('id-ID')}</TableCell>
					<TableCell>
						<span
							class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
							{item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : ''}
							{item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : ''}
							{item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : ''}"
						>
							{item.status}
						</span>
					</TableCell>
					<TableCell>{'-'}</TableCell>
					<TableCell class="text-right">
						<div class="flex justify-end gap-2">
							<Button size="sm" variant="outline" href={`pemeliharaan/${item.id}/edit`}>
								Edit
							</Button>

							<!-- Form Delete -->
							<form
								method="POST"
								action="?/delete"
								bind:this={deleteForm}
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											await invalidateAll();
										} else if (result.type === 'failure') {
											alert(result.data?.message || 'Gagal menghapus');
										}
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={item.id} />
								<Button
									size="sm"
									variant="destructive"
									type="button"
									onclick={() => confirmDelete(item.id, deleteForm!)}
								>
									Hapus
								</Button>
							</form>
						</div>
					</TableCell>
				</TableRow>
			{:else}
				<TableRow>
					<TableCell colspan={7} class="text-center">Belum ada data pemeliharaan</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>

	<!-- Dialog Konfirmasi Hapus -->
	<ConfirmationDialog
		bind:open={showDeleteDialog}
		type="error"
		title="Konfirmasi Hapus"
		description="Apakah Anda yakin ingin menghapus data pemeliharaan ini? Tindakan ini tidak dapat dibatalkan."
		cancelLabel="Batal"
		actionLabel="Hapus"
		onAction={handleDelete}
		onCancel={handleCancelDelete}
	/>
</div>
