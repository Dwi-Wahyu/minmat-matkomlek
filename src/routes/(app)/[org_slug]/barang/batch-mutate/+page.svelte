<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		ArrowLeft,
		ArrowRightLeft,
		Plus,
		Search,
		Trash2,
		Copy,
		Info,
		Package,
		CheckCircle2,
		X,
		ChevronLeft,
		ChevronRight,
		MapPin,
		FileText,
		Box
	} from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data, form } = $props();

	let loading = $state(false);
	let searchDialogOpen = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	// Search state
	let searchQuery = $state('');
	let searchResults = $state<any[]>([]);
	let searching = $state(false);
	let searchPage = $state(1);
	let searchTotalPages = $state(1);
	const searchLimit = 5;

	// Batch data state
	let batchItems = $state<any[]>(
		data.selectedItems?.map((item: any) => ({
			itemId: item.id,
			name: item.name,
			baseUnit: item.baseUnit,
			eventType: 'RECEIVE',
			qty: 1,
			fromWarehouseId: '',
			toWarehouseId: '',
			notes: ''
		})) || []
	);

	// Dialog editing state
	let notesDialogOpen = $state(false);
	let editingIndex = $state<number | null>(null);
	let tempValue = $state('');

	// Global settings state
	let globalEventType = $state('RECEIVE');
	let globalQty = $state(1);
	let globalToWarehouseId = $state('');
	let globalFromWarehouseId = $state('');

	const eventTypes = [
		{ value: 'RECEIVE', label: 'Penerimaan / Masuk (IN)' },
		{ value: 'ISSUE', label: 'Pengeluaran / Keluar (OUT)' },
		{ value: 'TRANSFER', label: 'Transfer Antar Gudang' },
		{ value: 'ADJUSTMENT', label: 'Penyesuaian (Set Stok)' }
	];

	const eventDescriptions = {
		RECEIVE: 'Menambah stok ke gudang tujuan.',
		ISSUE: 'Mengurangi stok dari gudang asal.',
		TRANSFER: 'Memindahkan stok dari satu gudang ke gudang lainnya.',
		ADJUSTMENT: 'Menetapkan jumlah stok secara absolut di gudang tujuan.'
	};

	const selectedEventDescription = $derived(
		eventDescriptions[globalEventType as keyof typeof eventDescriptions]
	);

	async function searchItems(pageParam = 1) {
		searching = true;
		searchPage = pageParam;
		try {
			const res = await fetch(
				`/api/${page.params.org_slug}/item/consumable?name=${searchQuery}&page=${pageParam}&limit=${searchLimit}`
			);
			if (res.ok) {
				const body = await res.json();
				// Map Indonesian keys to English keys used in component
				searchResults = body.data.map((item: any) => ({
					id: item.id,
					name: item.nama,
					baseUnit: item.satuan,
					description: item.deskripsi
				}));
				// API consumable might not return totalPages, calculating manually if totalItems exists
				// but let's assume it returns standard pagination if possible.
				// For now, if body.pagination exists, use it.
				searchTotalPages = body.pagination?.totalPages || 1;
				if (body.pagination?.totalItems) {
					searchTotalPages = Math.ceil(body.pagination.totalItems / searchLimit);
				}
			}
		} catch (error) {
			console.error('Error searching items:', error);
		} finally {
			searching = false;
		}
	}

	// Trigger initial search when dialog opens
	$effect(() => {
		if (searchDialogOpen) {
			searchItems(1);
		}
	});

	function addItem(item: any) {
		if (batchItems.some((b) => b.itemId === item.id)) {
			return;
		}
		batchItems.push({
			itemId: item.id,
			name: item.name,
			baseUnit: item.baseUnit,
			eventType: globalEventType,
			qty: globalQty,
			fromWarehouseId: globalFromWarehouseId,
			toWarehouseId: globalToWarehouseId,
			notes: ''
		});
	}

	function removeItem(index: number) {
		batchItems.splice(index, 1);
	}

	function openNotesDialog(index: number) {
		editingIndex = index;
		tempValue = batchItems[index].notes;
		notesDialogOpen = true;
	}

	function saveNotes() {
		if (editingIndex !== null) {
			batchItems[editingIndex].notes = tempValue;
		}
		notesDialogOpen = false;
		editingIndex = null;
	}

	function applyGlobalSettings() {
		batchItems = batchItems.map((item) => ({
			...item,
			eventType: globalEventType,
			qty: globalQty,
			fromWarehouseId: globalFromWarehouseId || item.fromWarehouseId,
			toWarehouseId: globalToWarehouseId || item.toWarehouseId
		}));
	}

	$effect(() => {
		if (form?.success) {
			notificationMsg = form.message || 'Mutasi batch barang berhasil dicatat';
			notificationType = 'success';
			notificationOpen = true;
			batchItems = [];
		} else if (form?.message) {
			notificationMsg = form.message;
			notificationType = 'error';
			notificationOpen = true;
		}
	});

	function handleBack() {
		goto(`/${page.params.org_slug}/barang`);
	}
</script>

<div class="mx-auto flex max-w-7xl flex-col gap-6 p-6">
	<div class="flex items-center justify-between px-6 md:px-0">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleBack}>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
					Mutasi Batch Barang
				</h1>
				<p class="text-sm text-muted-foreground">
					Catat mutasi stok untuk banyak jenis barang sekaligus.
				</p>
			</div>
		</div>
		<Button class="gap-2" onclick={() => (searchDialogOpen = true)}>
			<Plus class="size-4" />
			Tambah Barang
		</Button>
	</div>

	<!-- Kontrol Massal -->
	{#if batchItems.length > 0}
		<Card.Root class="border-primary/20 bg-primary/5">
			<Card.Content class="space-y-4">
				<div class="flex items-center gap-2 text-sm font-semibold text-primary">
					<Info class="size-4" />
					Pengaturan Massal
				</div>

				<div class="flex flex-wrap items-end gap-4">
					<div class="min-w-[180px] flex-1 space-y-1.5">
						<Label class="text-xs font-semibold uppercase">Jenis Kejadian</Label>
						<select
							bind:value={globalEventType}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							{#each eventTypes as type (type.value)}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>

					<div class="min-w-[100px] flex-initial space-y-1.5">
						<Label class="text-xs font-semibold uppercase">Qty</Label>
						<Input type="number" bind:value={globalQty} min="1" class="h-9 w-24" />
					</div>

					{#if globalEventType !== 'RECEIVE' && globalEventType !== 'ADJUSTMENT'}
						<div class="min-w-[180px] flex-1 space-y-1.5">
							<Label class="text-xs font-semibold uppercase">Gudang Asal</Label>
							<select
								bind:value={globalFromWarehouseId}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<option value="">-- Pilih Gudang --</option>
								{#each data.warehouses as wh (wh.id)}
									<option value={wh.id}>{wh.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					{#if globalEventType !== 'ISSUE'}
						<div class="min-w-[180px] flex-1 space-y-1.5">
							<Label class="text-xs font-semibold uppercase">Gudang Tujuan</Label>
							<select
								bind:value={globalToWarehouseId}
								class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								<option value="">-- Pilih Gudang --</option>
								{#each data.warehouses as wh (wh.id)}
									<option value={wh.id}>{wh.name}</option>
								{/each}
							</select>
						</div>
					{/if}

					<Button variant="secondary" size="sm" class="gap-2" onclick={applyGlobalSettings}>
						<Copy class="size-4" />
						Terapkan
					</Button>
				</div>

				{#if selectedEventDescription}
					<div
						class="rounded-md bg-blue-50 p-2 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
					>
						<strong>Info:</strong>
						{selectedEventDescription}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root class="overflow-hidden">
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="min-w-[180px]">Nama Barang</Table.Head>
						<Table.Head class="w-[120px]">Qty</Table.Head>
						<Table.Head class="min-w-[150px]">Jenis</Table.Head>
						<Table.Head class="min-w-[180px]">Gudang Asal</Table.Head>
						<Table.Head class="min-w-[180px]">Gudang Tujuan</Table.Head>
						<Table.Head class="w-[80px]"></Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each batchItems as item, i (item.itemId)}
						<Table.Row>
							<Table.Cell>
								<div class="max-w-[200px] truncate font-medium" title={item.name}>{item.name}</div>
								<div class="text-[10px] text-muted-foreground uppercase">
									Satuan: {item.baseUnit}
								</div>
							</Table.Cell>
							<Table.Cell>
								<Input type="number" bind:value={item.qty} min="1" class="h-8 text-xs" />
							</Table.Cell>
							<Table.Cell>
								<select
									bind:value={item.eventType}
									class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									{#each eventTypes as type (type.value)}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</Table.Cell>
							<Table.Cell>
								{#if item.eventType !== 'RECEIVE' && item.eventType !== 'ADJUSTMENT'}
									<select
										bind:value={item.fromWarehouseId}
										class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									>
										<option value="">-- Pilih Gudang --</option>
										{#each data.warehouses as wh (wh.id)}
											<option value={wh.id}>{wh.name}</option>
										{/each}
									</select>
								{:else}
									<div
										class="h-8 rounded bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground italic"
									>
										N/A
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell>
								{#if item.eventType !== 'ISSUE'}
									<select
										bind:value={item.toWarehouseId}
										class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
									>
										<option value="">-- Pilih Gudang --</option>
										{#each data.warehouses as wh (wh.id)}
											<option value={wh.id}>{wh.name}</option>
										{/each}
									</select>
								{:else}
									<div
										class="h-8 rounded bg-muted/50 px-2 py-1.5 text-[10px] text-muted-foreground italic"
									>
										Luar Sistem
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										onclick={() => openNotesDialog(i)}
										title="Catatan"
									>
										<FileText class="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8 text-destructive"
										onclick={() => removeItem(i)}
										title="Hapus"
									>
										<Trash2 class="size-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
								<div class="flex flex-col items-center gap-2">
									<Box class="size-8 opacity-20" />
									<p>Belum ada barang yang ditambahkan.</p>
									<Button variant="outline" size="sm" onclick={() => (searchDialogOpen = true)}>
										Tambah Barang Sekarang
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		{#if batchItems.length > 0}
			<Card.Footer class="flex justify-between border-t">
				<div class="text-sm text-muted-foreground">
					Total: <strong>{batchItems.length}</strong> jenis barang akan diproses.
				</div>
				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ update }) => {
							loading = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="batchData" value={JSON.stringify(batchItems)} />
					<Button type="submit" disabled={loading} class="gap-2 px-8">
						{#if loading}
							<div
								class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
							></div>
						{:else}
							<ArrowRightLeft class="size-4" />
						{/if}
						Proses Mutasi Batch
					</Button>
				</form>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>

<!-- Dialog Pencarian Barang -->
<Dialog.Root bind:open={searchDialogOpen}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Pilih Barang untuk Dimutasi</Dialog.Title>
			<Dialog.Description>Cari barang berdasarkan nama atau deskripsi.</Dialog.Description>
		</Dialog.Header>

		<div class="flex gap-2 py-4">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input placeholder="Ketik minimal 2 karakter..." class="pl-10" bind:value={searchQuery} />
			</div>
			<Button onclick={() => searchItems(1)} disabled={searching}>Cari</Button>
		</div>

		<div class="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
			{#if searching}
				<div class="flex items-center justify-center py-10">
					<div
						class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
				</div>
			{:else if searchResults.length > 0}
				<div class="grid gap-2">
					{#each searchResults as item (item.id)}
						{@const isAdded = batchItems.some((b) => b.itemId === item.id)}
						<div
							class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
						>
							<div class="flex items-center gap-3">
								<div class="flex size-10 items-center justify-center rounded bg-muted">
									<Box class="size-5 text-muted-foreground" />
								</div>
								<div>
									<div class="font-medium">{item.name}</div>
									<div class="text-xs text-muted-foreground">
										Satuan: {item.baseUnit}
									</div>
								</div>
							</div>
							<Button
								variant={isAdded ? 'secondary' : 'default'}
								size="sm"
								disabled={isAdded}
								onclick={() => addItem(item)}
							>
								{#if isAdded}
									<CheckCircle2 class="mr-2 size-4" />
									Ditambahkan
								{:else}
									<Plus class="mr-2 size-4" />
									Pilih
								{/if}
							</Button>
						</div>
					{/each}
				</div>

				<!-- Pagination Controls -->
				{#if searchTotalPages > 1}
					<div class="flex items-center justify-between border-t pt-4">
						<p class="text-xs text-muted-foreground">
							Halaman {searchPage} dari {searchTotalPages}
						</p>
						<div class="flex gap-2">
							<Button
								variant="outline"
								size="icon"
								class="size-8"
								disabled={searchPage <= 1}
								onclick={() => searchItems(searchPage - 1)}
							>
								<ChevronLeft class="size-4" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="size-8"
								disabled={searchPage >= searchTotalPages}
								onclick={() => searchItems(searchPage + 1)}
							>
								<ChevronRight class="size-4" />
							</Button>
						</div>
					</div>
				{/if}
			{:else}
				<div class="py-10 text-center text-muted-foreground">
					{searchQuery ? 'Barang tidak ditemukan.' : 'Gunakan pencarian untuk menemukan barang.'}
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (searchDialogOpen = false)}>Selesai</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Dialog Catatan -->
<Dialog.Root bind:open={notesDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Ubah Catatan</Dialog.Title>
			<Dialog.Description>Tambahkan keterangan tambahan untuk mutasi barang ini.</Dialog.Description
			>
		</Dialog.Header>
		<div class="py-4">
			<Label for="notes-input" class="mb-2 block">Catatan / Keterangan</Label>
			<Textarea id="notes-input" bind:value={tempValue} placeholder="Ketik catatan di sini..." />
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (notesDialogOpen = false)}>Batal</Button>
			<Button onclick={saveNotes}>Simpan</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
