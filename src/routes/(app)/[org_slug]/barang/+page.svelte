<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import {
		Search,
		Plus,
		Pencil,
		Trash2,
		ArrowRightLeft,
		Ellipsis,
		Package,
		Info,
		Box
	} from '@lucide/svelte';

	let { data } = $props();

	// Selection state
	let selectedIds = $state<string[]>([]);
	const isAllSelected = $derived(
		data.consumables.length > 0 && selectedIds.length === data.consumables.length
	);

	function toggleSelectAll() {
		if (isAllSelected) {
			selectedIds = [];
		} else {
			selectedIds = data.consumables.map((item) => item.id);
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	// State Dialogs
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	let mutateDialogOpen = $state(false);
	let mutateLoading = $state(false);
	let mutateQty = $state(1);
	let mutateType = $state('ADJUSTMENT');
	let mutateNotes = $state('');
	let mutateWarehouseId = $state('');

	const mutateTypeOptions = [
		{ value: 'ADJUSTMENT', label: 'Penyesuaian (Adjustment)' },
		{ value: 'ISSUE', label: 'Keluar (Issue)' },
		{ value: 'RECEIVE', label: 'Masuk (Receive)' }
	];

	const mutateTrigger = $derived(
		mutateTypeOptions.find((o) => o.value === mutateType)?.label ?? 'Pilih Jenis'
	);

	const warehouseTrigger = $derived(
		data.warehouses.find((w) => w.id === mutateWarehouseId)?.name ?? 'Pilih Gudang'
	);

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}

	function openMutate(id: string) {
		selectedId = id;
		mutateWarehouseId = '';
		mutateDialogOpen = true;
	}

	function formatStock(qty: string | number, baseUnit: string, conversions: any[]) {
		let total = Number(qty);
		if (total === 0) return '0 ' + baseUnit;

		// Sort conversions by multiplier (largest first)
		const sorted = [...(conversions || [])].sort(
			(a, b) => Number(b.multiplier) - Number(a.multiplier)
		);

		let result: string[] = [];
		let remaining = total;

		for (const conv of sorted) {
			const mult = Number(conv.multiplier);
			if (mult <= 0) continue;

			const amount = Math.floor(remaining / mult);
			if (amount > 0) {
				result.push(`${amount} ${conv.fromUnit}`);
				remaining = Number((remaining % mult).toFixed(4));
			}
		}

		if (remaining > 0 || result.length === 0) {
			result.push(`${remaining} ${baseUnit}`);
		}

		return result.join(' ');
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
				Barang Habis Pakai
			</h1>
			<p class="text-sm text-muted-foreground">
				Kelola stok barang habis pakai dan materiil konsumsi.
			</p>
		</div>
		<div class="flex flex-wrap gap-2 md:gap-3">
			<!-- <Button
				href="/{page.params.org_slug}/barang/batch-mutate{selectedIds.length > 0
					? `?ids=${selectedIds.join(',')}`
					: ''}"
				variant="outline"
				class="gap-2"
			>
				<ArrowRightLeft class="size-4" />
				Mutasi Batch {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
			</Button> -->
			<Button href="/{page.params.org_slug}/barang/create" class="gap-2">
				<Plus class="size-4" />
				Tambah Barang
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<form method="GET" class="w-full">
				<Input
					name="name"
					placeholder="Cari nama barang atau deskripsi..."
					class="pl-10"
					value={data.filters.name}
				/>
			</form>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head class="w-[50px] text-center">
							<Checkbox
								checked={isAllSelected}
								onCheckedChange={toggleSelectAll}
								aria-label="Pilih semua"
							/>
						</Table.Head>
						<Table.Head class="w-[50px] text-center">No</Table.Head>
						<Table.Head class="min-w-[200px]">Nama Barang</Table.Head>
						<Table.Head class="text-center">Total Stok</Table.Head>
						<Table.Head>Satuan Dasar</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.consumables as item, i (item.id)}
						<Table.Row class="transition-colors hover:bg-muted/30">
							<Table.Cell class="text-center">
								<Checkbox
									checked={selectedIds.includes(item.id)}
									onCheckedChange={() => toggleSelect(item.id)}
									aria-label="Pilih item"
								/>
							</Table.Cell>
							<Table.Cell class="text-center font-medium text-muted-foreground">
								{i + 1 + (data.pagination.currentPage - 1) * 10}
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-1">
									<span class="font-semibold text-foreground">{item.name}</span>
									<span class="font-mono text-[10px] text-muted-foreground"
										>ID: {item.id.slice(0, 8)}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">
								<div class="flex flex-col items-center gap-0.5">
									<span class="font-medium text-foreground">
										{formatStock(item.totalStock || 0, item.baseUnit, item.conversions || [])}
									</span>
									{#if item.conversions?.length > 0 && Number(item.totalStock || 0) > 0}
										<span class="text-[10px] text-muted-foreground italic">
											(Total: {Number(item.totalStock)}
											{item.baseUnit})
										</span>
									{/if}
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline" class="border-blue-200 bg-blue-50 text-blue-700">
									{item.baseUnit}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-48">
										<DropdownMenu.Item onclick={() => openMutate(item.id)} class="gap-2">
											<ArrowRightLeft class="size-4" /> Mutasi Manual
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() => goto(`/${page.params.org_slug}/barang/edit/${item.id}`)}
											class="gap-2"
										>
											<Pencil class="size-4" /> Edit Data
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => confirmDelete(item.id)}
											class="gap-2 text-red-600"
										>
											<Trash2 class="size-4" /> Hapus Barang
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground italic">
								Tidak ada data barang ditemukan.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>

		{#if data.pagination.totalPages > 1}
			<div
				class="flex flex-col gap-4 border-t bg-muted/20 px-6 py-4 md:flex-row md:items-center md:justify-between"
			>
				<p class="text-sm font-medium text-muted-foreground">
					Halaman <span class="font-bold text-foreground">{data.pagination.currentPage}</span> dari {data
						.pagination.totalPages}
				</p>
				<div class="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.currentPage <= 1}
						href="?page={data.pagination.currentPage - 1}&name={data.filters.name}"
					>
						Sebelumnya
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.currentPage >= data.pagination.totalPages}
						href="?page={data.pagination.currentPage + 1}&name={data.filters.name}"
					>
						Selanjutnya
					</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- HIDDEN FORMS -->
<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		deleteLoading = true;
		return async ({ result, update }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			await update();
			if (result.type === 'success') {
				notificationMsg = 'Barang berhasil dihapus';
				notificationType = 'success';
				notificationOpen = true;
			} else {
				notificationMsg = result.data?.message || 'Gagal menghapus barang';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={selectedId} />
</form>

<form
	id="mutate-form"
	method="POST"
	action="?/mutate"
	use:enhance={() => {
		mutateLoading = true;
		return async ({ result, update }) => {
			mutateLoading = false;
			if (result.type === 'success') {
				mutateDialogOpen = false;
				await update();
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				// Reset fields
				mutateQty = 1;
				mutateNotes = '';
				mutateWarehouseId = '';
			} else {
				notificationMsg = result.data?.message || 'Gagal mencatat mutasi';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="itemId" value={selectedId} />
	<input type="hidden" name="qty" value={mutateQty} />
	<input type="hidden" name="type" value={mutateType} />
	<input type="hidden" name="notes" value={mutateNotes} />
	<input type="hidden" name="warehouseId" value={mutateWarehouseId} />
</form>

<!-- DIALOGS -->
<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Barang"
	description="Apakah Anda yakin? Barang yang dihapus tidak dapat dipulihkan."
	actionLabel="Hapus Permanen"
	onAction={() => document.getElementById('delete-form').requestSubmit()}
/>

<ConfirmationDialog
	bind:open={mutateDialogOpen}
	loading={mutateLoading}
	type="info"
	title="Mutasi / Penyesuaian Stok"
	description="Catat pergerakan stok manual untuk barang ini."
	actionLabel="Simpan Mutasi"
	onAction={() => {
		if (!mutateWarehouseId) {
			notificationMsg = 'Pilih gudang terlebih dahulu';
			notificationType = 'error';
			notificationOpen = true;
			return;
		}
		document.getElementById('mutate-form').requestSubmit();
	}}
>
	<div class="mt-4 grid gap-4 text-left">
		<div class="space-y-2">
			<Label>Pilih Gudang</Label>
			<Select.Root type="single" bind:value={mutateWarehouseId}>
				<Select.Trigger class="w-full">
					{warehouseTrigger}
				</Select.Trigger>
				<Select.Content>
					{#each data.warehouses as wh (wh.id)}
						<Select.Item value={wh.id} label={wh.name}>{wh.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-2">
			<Label>Jenis Pergerakan</Label>
			<Select.Root type="single" bind:value={mutateType}>
				<Select.Trigger class="w-full">
					{mutateTrigger}
				</Select.Trigger>
				<Select.Content>
					{#each mutateTypeOptions as opt (opt.value)}
						<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="space-y-2">
			<Label>Jumlah (Qty)</Label>
			<Input type="number" bind:value={mutateQty} min="1" />
		</div>
		<div class="space-y-2">
			<Label>Catatan / Keterangan</Label>
			<Input bind:value={mutateNotes} placeholder="Contoh: Barang rusak saat pengiriman..." />
		</div>
	</div>
</ConfirmationDialog>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
