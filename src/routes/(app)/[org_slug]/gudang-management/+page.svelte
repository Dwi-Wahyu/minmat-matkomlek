<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Plus, Pencil, Trash2, Warehouse, MapPin } from '@lucide/svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error'>('success');

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Manajemen Gudang</h1>
			<p class="text-sm text-muted-foreground">
				Kelola lokasi gudang penyimpanan materiil di organisasi Anda.
			</p>
		</div>
		<Button href="/{page.params.org_slug}/gudang-management/create" class="gap-2">
			<Plus class="size-4" />
			Tambah Gudang
		</Button>
	</header>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head class="w-12 text-center">No</Table.Head>
					<Table.Head>Nama Gudang</Table.Head>
					<Table.Head>Lokasi</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.warehouses as wh, i (wh.id)}
					<Table.Row class="transition-colors hover:bg-muted/30">
						<Table.Cell class="text-center font-medium text-muted-foreground">
							{i + 1}
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div class="rounded-md bg-blue-50 p-2 text-blue-600">
									<Warehouse class="size-4" />
								</div>
								<span class="font-semibold text-foreground">{wh.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-1.5 text-muted-foreground">
								<MapPin class="size-3.5" />
								<span class="text-sm">{wh.location || '-'}</span>
							</div>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									class="h-8 gap-1.5 px-2"
									href="/{page.params.org_slug}/gudang-management/edit/{wh.id}"
								>
									<Pencil class="size-3.5" />
									<span class="hidden lg:inline">Edit</span>
								</Button>

								<Button
									variant="outline"
									size="sm"
									class="h-8 border-red-200 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
									onclick={() => confirmDelete(wh.id)}
								>
									<Trash2 class="size-3.5" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={4} class="h-32 text-center text-muted-foreground italic">
							Belum ada data gudang.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<!-- DELETE FORM -->
<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		deleteLoading = true;
		return async ({ result, update }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			if (result.type === 'success') {
				await update();
				notificationMsg = 'Gudang berhasil dihapus';
				notificationType = 'success';
				notificationOpen = true;
			} else {
				notificationMsg = result.data?.message || 'Gagal menghapus gudang';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={selectedId} />
</form>

<!-- DIALOGS -->
<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Gudang"
	description="Apakah Anda yakin ingin menghapus gudang ini? Data materiil yang terhubung mungkin akan terpengaruh."
	actionLabel="Hapus Gudang"
	onAction={() => document.getElementById('delete-form').requestSubmit()}
/>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
