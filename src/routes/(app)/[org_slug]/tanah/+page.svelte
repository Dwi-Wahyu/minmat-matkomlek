<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Search, Plus, Pencil, Trash2, Ellipsis, MapPin, FileText } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}

	const statusColors: Record<string, string> = {
		MILIK_TNI: 'bg-green-100 text-green-700',
		SEWA: 'bg-yellow-100 text-yellow-700'
	};
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Data Tanah</h1>
			<p class="text-sm text-muted-foreground">
				Kelola informasi data tanah di bawah kewenangan satuan.
			</p>
		</div>
		<Button href="/{page.params.org_slug}/tanah/create" class="gap-2">
			<Plus class="size-4" />
			Tambah Data Tanah
		</Button>
	</div>

	<div class="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<form method="GET" class="w-full">
				<Input
					name="q"
					placeholder="Cari berdasarkan No. Sertifikat, lokasi, atau peruntukan..."
					class="pl-10"
					value={data.filters.q}
				/>
			</form>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head class="text-center">No</Table.Head>
					<Table.Head>Sertifikat / Lokasi</Table.Head>
					<Table.Head>Luas</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head>Peruntukan</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.lands as item, i}
					<Table.Row>
						<Table.Cell class="text-center"
							>{(data.pagination.currentPage - 1) * 10 + i + 1}</Table.Cell
						>
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-medium text-foreground">{item.certificateNumber}</span>
								<span class="text-xs text-muted-foreground">{item.location}</span>
							</div>
						</Table.Cell>
						<Table.Cell>{item.area} m²</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class={statusColors[item.status]}>
								{item.status.replace('_', ' ')}
							</Badge>
						</Table.Cell>
						<Table.Cell>{item.usage}</Table.Cell>
						<Table.Cell class="text-right">
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="ghost" size="icon">
										<Ellipsis class="size-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#if item.latitude && item.longitude}
										<DropdownMenu.Item
											onclick={() =>
												window.open(
													`https://www.google.com/maps?q=${item.latitude},${item.longitude}`,
													'_blank'
												)}
										>
											<MapPin class="mr-2 size-4" />
											Lihat Lokasi
										</DropdownMenu.Item>
									{/if}
									<DropdownMenu.Item
										onclick={() => goto(`/${page.params.org_slug}/tanah/edit/${item.id}`)}
									>
										<Pencil class="mr-2 size-4" />
										Edit
									</DropdownMenu.Item>
									<DropdownMenu.Item
										onclick={() => confirmDelete(item.id)}
										class="text-destructive"
									>
										<Trash2 class="mr-2 size-4" />
										Hapus
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
							Data tidak ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<ConfirmationDialog
	bind:open={deleteDialogOpen}
	type="error"
	title="Hapus Data Tanah"
	description="Apakah Anda yakin ingin menghapus data tanah ini? Tindakan ini tidak dapat dibatalkan."
	loading={deleteLoading}
	onAction={async () => {
		deleteLoading = true;
		const formData = new FormData();
		formData.append('id', selectedId);

		const response = await fetch('?/delete', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		deleteLoading = false;
		deleteDialogOpen = false;

		if (result.type === 'success') {
			notificationMsg = 'Data tanah berhasil dihapus';
			notificationType = 'success';
			notificationOpen = true;
			// Manual refresh or wait for enhance
			window.location.reload();
		} else {
			notificationMsg = 'Gagal menghapus data tanah';
			notificationType = 'error';
			notificationOpen = true;
		}
	}}
/>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	description={notificationMsg}
/>
