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
		X
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

	// Batch data state
	let batchItems = $state<any[]>([]);

	// Global settings state
	let globalEventType = $state('RECEIVE');
	let globalClassification = $state('KOMUNITY');
	let globalToWarehouseId = $state('');

	const eventTypes = [
		{ value: 'RECEIVE', label: 'Penerimaan / Masuk (Eksternal)' },
		{ value: 'ISSUE', label: 'Pengeluaran / Keluar (Permanen)' },
		{ value: 'TRANSFER_OUT', label: 'Transfer Keluar (Internal)' },
		{ value: 'TRANSFER_IN', label: 'Transfer Masuk (Internal)' }
	];

	const classifications = [
		{ value: 'KOMUNITY', label: 'Komunity' },
		{ value: 'BALKIR', label: 'Balkir' },
		{ value: 'TRANSITO', label: 'Transito' }
	];

	async function searchEquipment() {
		if (searchQuery.length < 2) return;
		searching = true;
		try {
			const res = await fetch(`/api/equipment?q=${encodeURIComponent(searchQuery)}`);
			if (res.ok) {
				searchResults = await res.json();
			}
		} catch (error) {
			console.error('Error searching equipment:', error);
		} finally {
			searching = false;
		}
	}

	function addItem(eq: any) {
		if (batchItems.some((item) => item.equipmentId === eq.id)) {
			return;
		}
		batchItems.push({
			equipmentId: eq.id,
			name: eq.item.name,
			sn: eq.serialNumber,
			currentWarehouse: eq.warehouse?.name || 'Tanpa Gudang',
			eventType: globalEventType,
			classification: globalClassification,
			toWarehouseId: globalToWarehouseId || eq.warehouseId || '',
			notes: ''
		});
	}

	function removeItem(index: number) {
		batchItems.splice(index, 1);
	}

	function applyGlobalSettings() {
		batchItems = batchItems.map((item) => ({
			...item,
			eventType: globalEventType,
			classification: globalClassification,
			toWarehouseId: globalToWarehouseId || item.toWarehouseId
		}));
	}

	$effect(() => {
		if (form?.success) {
			notificationMsg = form.message || 'Mutasi batch berhasil dicatat';
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
		goto(`/${page.params.org_slug}/dashboard`);
	}
</script>

<div class="mx-auto flex max-w-6xl flex-col gap-6 py-6">
	<div class="flex items-center justify-between px-6 md:px-0">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleBack}>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Mutasi Batch Alat</h1>
				<p class="text-sm text-muted-foreground">Catat mutasi untuk banyak alat sekaligus.</p>
			</div>
		</div>
		<Button class="gap-2" onclick={() => (searchDialogOpen = true)}>
			<Plus class="size-4" />
			Tambah Alat
		</Button>
	</div>

	<!-- Kontrol Massal -->
	{#if batchItems.length > 0}
		<Card.Root class="border-primary/20 bg-primary/5">
			<Card.Content class="p-4">
				<div class="flex flex-wrap items-end gap-4">
					<div class="space-y-1.5">
						<Label class="text-xs font-semibold uppercase">Jenis Kejadian (Massal)</Label>
						<select
							bind:value={globalEventType}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							{#each eventTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-semibold uppercase">Klasifikasi (Massal)</Label>
						<select
							bind:value={globalClassification}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							{#each classifications as cl}
								<option value={cl.value}>{cl.label}</option>
							{/each}
						</select>
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-semibold uppercase">Gudang Tujuan (Massal)</Label>
						<select
							bind:value={globalToWarehouseId}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							<option value="">-- Pilih Gudang --</option>
							{#each data.warehouses as wh}
								<option value={wh.id}>{wh.name}</option>
							{/each}
						</select>
					</div>

					<Button variant="secondary" size="sm" class="gap-2" onclick={applyGlobalSettings}>
						<Copy class="size-4" />
						Terapkan ke Semua
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<Card.Root>
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[200px]">Alat / SN</Table.Head>
					<Table.Head>Jenis Kejadian</Table.Head>
					<Table.Head>Klasifikasi</Table.Head>
					<Table.Head>Gudang Tujuan</Table.Head>
					<Table.Head>Catatan</Table.Head>
					<Table.Head class="w-[50px]"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each batchItems as item, i}
					<Table.Row>
						<Table.Cell>
							<div class="font-medium">{item.name}</div>
							<div class="font-mono text-xs text-muted-foreground">SN: {item.sn || '-'}</div>
						</Table.Cell>
						<Table.Cell>
							<select
								bind:value={item.eventType}
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								{#each eventTypes as type}
									<option value={type.value}>{type.label}</option>
								{/each}
							</select>
						</Table.Cell>
						<Table.Cell>
							<select
								bind:value={item.classification}
								class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							>
								{#each classifications as cl}
									<option value={cl.value}>{cl.label}</option>
								{/each}
							</select>
						</Table.Cell>
						<Table.Cell>
							{#if ['RECEIVE', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(item.eventType)}
								<select
									bind:value={item.toWarehouseId}
									class="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									<option value="">-- Pilih Gudang --</option>
									{#each data.warehouses as wh}
										<option value={wh.id}>{wh.name}</option>
									{/each}
								</select>
							{:else}
								<span class="text-[10px] italic text-muted-foreground">Luar Sistem</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<Input
								class="h-8 text-xs"
								placeholder="Keterangan..."
								bind:value={item.notes}
							/>
						</Table.Cell>
						<Table.Cell>
							<Button variant="ghost" size="icon" class="h-8 w-8 text-destructive" onclick={() => removeItem(i)}>
								<Trash2 class="size-4" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
							Belum ada alat yang ditambahkan. Klik tombol "Tambah Alat" untuk memulai.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		{#if batchItems.length > 0}
			<Card.Footer class="flex justify-end border-t bg-muted/30 py-4">
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
					<Button type="submit" disabled={loading} class="gap-2">
						{#if loading}
							<div class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
						{:else}
							<ArrowRightLeft class="size-4" />
						{/if}
						Proses Mutasi ({batchItems.length} Alat)
					</Button>
				</form>
			</Card.Footer>
		{/if}
	</Card.Root>
</div>

<!-- Dialog Pencarian Alat -->
<Dialog.Root bind:open={searchDialogOpen}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Pilih Alat untuk Dimutasi</Dialog.Title>
			<Dialog.Description>Cari alat berdasarkan nama atau nomor seri.</Dialog.Description>
		</Dialog.Header>

		<div class="flex gap-2 py-4">
			<div class="relative flex-1">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Ketik minimal 2 karakter..."
					class="pl-10"
					bind:value={searchQuery}
					onkeydown={(e) => e.key === 'Enter' && searchEquipment()}
				/>
			</div>
			<Button onclick={searchEquipment} disabled={searching}>Cari</Button>
		</div>

		<div class="max-h-[50vh] overflow-y-auto pr-2">
			{#if searching}
				<div class="flex items-center justify-center py-10">
					<div class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
				</div>
			{:else if searchResults.length > 0}
				<div class="grid gap-2">
					{#each searchResults as eq}
						{@const isAdded = batchItems.some((item) => item.equipmentId === eq.id)}
						<div class="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
							<div class="flex items-center gap-3">
								<div class="flex size-10 items-center justify-center rounded bg-muted">
									<Package class="size-5 text-muted-foreground" />
								</div>
								<div>
									<div class="font-medium">{eq.item.name}</div>
									<div class="flex gap-2 text-xs text-muted-foreground">
										<span class="font-mono">SN: {eq.serialNumber || '-'}</span>
										<span>•</span>
										<span>Gudang: {eq.warehouse?.name || 'Tanpa Gudang'}</span>
									</div>
								</div>
							</div>
							<Button
								variant={isAdded ? 'secondary' : 'default'}
								size="sm"
								disabled={isAdded}
								onclick={() => addItem(eq)}
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
			{:else if searchQuery.length >= 2}
				<div class="py-10 text-center text-muted-foreground">Alat tidak ditemukan.</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (searchDialogOpen = false)}>Selesai</Button>
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
