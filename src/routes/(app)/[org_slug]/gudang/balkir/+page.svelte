<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { Search, Box, HardDrive, Building2, Trash2, AlertTriangle } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let searchQuery = $state('');
	let loading = $state(false);
	let deleteFormEl: HTMLFormElement;

	// Confirmation Dialog State
	let confirmOpen = $state(false);
	let selectedMovementId = $state('');
	let selectedItemName = $state('');

	// Notification State
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let filteredItems = $derived(
		data.movements.filter(
			(item) =>
				item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.sn && item.sn.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	function handleOrgChange(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('orgId', val);
		goto(newUrl.toString());
	}

	function openConfirm(id: string, name: string, sn: string | null) {
		selectedMovementId = id;
		selectedItemName = sn ? `${name} (SN: ${sn})` : name;
		confirmOpen = true;
	}

	function handleConfirm() {
		if (deleteFormEl) {
			deleteFormEl.requestSubmit();
		}
	}

	$effect(() => {
		if (form?.success) {
			notificationMsg = form.message || 'Barang berhasil dihapus permanen';
			notificationType = 'success';
			notificationOpen = true;
		} else if (form?.message) {
			notificationMsg = form.message;
			notificationType = 'error';
			notificationOpen = true;
		}
	});

	let selectedOrgName = $derived(
		data.organizations.find((o) => o.id === data.selectedOrgId)?.name || 'Pilih Kesatuan'
	);
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<header class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight">Gudang Balkir</h1>
			<p class="text-sm text-muted-foreground">
				Barang dalam tahap persiapan penghapusan atau ekspedisi.
			</p>
			{#if data.isMabes}
				<p class="text-xs text-muted-foreground">
					Kesatuan: <span class="font-semibold text-primary">{selectedOrgName}</span>
				</p>
			{/if}
		</header>

		<div class="flex flex-wrap items-end gap-4">
			{#if data.isMabes}
				<div class="flex flex-col gap-1.5">
					<Label for="org-filter">Filter Kesatuan</Label>
					<SearchableSelect.Root
						type="single"
						value={data.selectedOrgId}
						onValueChange={handleOrgChange}
					>
						<SearchableSelect.Trigger class="w-[250px] border-2">
							<Building2 class="mr-2 h-4 w-4 opacity-50" />
							{selectedOrgName}
						</SearchableSelect.Trigger>
						<SearchableSelect.Content>
							{#each data.organizations as org (org.id)}
								<SearchableSelect.Item value={org.id} label={org.name}
									>{org.name}</SearchableSelect.Item
								>
							{/each}
						</SearchableSelect.Content>
					</SearchableSelect.Root>
				</div>
			{/if}
			<div class="flex flex-col gap-1.5">
				<Label for="search">Cari Barang</Label>
				<div class="relative max-w-md flex-1">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="search"
						type="text"
						placeholder="Cari nama barang atau nomor seri..."
						class="w-[300px] border-2 pl-10"
						bind:value={searchQuery}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="rounded-lg bg-card shadow-sm border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Nama Item & Serial Number</Table.Head>
					<Table.Head>Kuantitas</Table.Head>
					<Table.Head>Asal Gudang</Table.Head>
					<Table.Head>Lokasi/Unit</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredItems as item (item.id)}
					<Table.Row>
						<Table.Cell>
							<div class="font-semibold">{item.nama}</div>
							{#if item.sn}
								<div class="font-mono text-xs text-muted-foreground">SN: {item.sn}</div>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<span class="text-base font-medium">{Number(item.qty)}</span>
							<span class="ml-1 text-xs text-muted-foreground">{item.satuan}</span>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm">{item.fromWarehouse ?? 'Pusat/Luar'}</span>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm">{item.lokasi || '-'}</span>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="destructive"
								size="sm"
								class="gap-2"
								onclick={() => openConfirm(item.id, item.nama, item.sn)}
							>
								<Trash2 class="size-4" />
								Hapus Permanen
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={5} class="h-32 text-center text-muted-foreground">
							Data balkir tidak ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<ConfirmationDialog
	bind:open={confirmOpen}
	type="error"
	title="Hapus Permanen Barang?"
	description="Tindakan ini akan mencatat status ISSUE (Keluar Permanen) untuk {selectedItemName}. Barang akan dihapus dari stok aktif dan tidak dapat dikembalikan."
	loading={loading}
	onAction={handleConfirm}
/>

<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/delete"
	use:enhance={() => {
		loading = true;
		confirmOpen = false;
		return async ({ update }) => {
			loading = false;
			await update();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="id" value={selectedMovementId} />
</form>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
