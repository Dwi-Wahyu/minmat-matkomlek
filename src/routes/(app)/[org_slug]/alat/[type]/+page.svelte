<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		Search,
		Plus,
		Pencil,
		Trash2,
		Package,
		ArrowRightLeft,
		Info,
		Ellipsis,
		ArrowLeft
	} from '@lucide/svelte';

	let { data } = $props();

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	// Selection state
	let selectedIds = $state<string[]>([]);
	const isAllSelected = $derived(
		data.equipment.length > 0 && selectedIds.length === data.equipment.length
	);

	function toggleSelectAll() {
		if (isAllSelected) {
			selectedIds = [];
		} else {
			selectedIds = data.equipment.map((item) => item.id);
		}
	}

	function toggleSelect(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}

	function openMutate(id: string) {
		goto(`/${page.params.org_slug}/alat/${data.type}/mutate/${id}`);
	}

	const conditionColors: Record<string, string> = {
		BAIK: 'bg-green-100 text-green-700 border-green-200',
		RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
		RUSAK_BERAT: 'bg-red-100 text-red-700 border-red-200'
	};

	const statusColors: Record<string, string> = {
		READY: 'bg-blue-100 text-blue-700',
		IN_USE: 'bg-purple-100 text-purple-700',
		TRANSIT: 'bg-orange-100 text-orange-700',
		MAINTENANCE: 'bg-red-100 text-red-700'
	};

	const statusLabels: Record<string, string> = {
		READY: 'Tersedia',
		IN_USE: 'Digunakan',
		TRANSIT: 'Transit',
		MAINTENANCE: 'Perbaikan'
	};

	const conditionLabels: Record<string, string> = {
		BAIK: 'Baik',
		RUSAK_RINGAN: 'Rusak Ringan',
		RUSAK_BERAT: 'Rusak Berat'
	};

	const eventTypeLabels: Record<string, string> = {
		RECEIVE: 'Masuk',
		ISSUE: 'Keluar',
		TRANSFER_IN: 'Transfer Masuk',
		TRANSFER_OUT: 'Transfer Keluar',
		MAINTENANCE_IN: 'Masuk Perbaikan',
		MAINTENANCE_OUT: 'Selesai Perbaikan',
		ADJUSTMENT: 'Penyesuaian'
	};

	function handleBack() {
		const backUrl = page.url.searchParams.get('back_url');
		if (backUrl) {
			goto(backUrl);
		} else {
			goto(`/${page.params.org_slug}/dashboard`);
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div class="flex items-center gap-4">
			<div>
				<h1 class="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
					Data {typeLabel}
				</h1>
				<p class="text-sm text-muted-foreground">
					Kelola aset dan peralatan {typeLabel.toLowerCase()} satuan.
				</p>
			</div>
		</div>
		<div class="flex flex-wrap gap-2 md:gap-3">
			<!-- <Button
				href="/{page.params.org_slug}/alat/batch-mutate{selectedIds.length > 0
					? `?ids=${selectedIds.join(',')}`
					: ''}"
				variant="outline"
				class="gap-2"
			>
				<ArrowRightLeft class="size-4" />
				Mutasi Batch {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
			</Button> -->
			<Button href="/{page.params.org_slug}/alat/{data.type}/create" class="gap-2">
				<Plus class="size-4" />
				Tambah Alat
			</Button>
		</div>
	</div>

	<div class="flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<form method="GET" class="w-full">
				<Input
					name="q"
					placeholder="Cari berdasarkan serial number, brand, atau nama barang..."
					class="pl-10"
					value={data.filters.q}
				/>
				<input type="hidden" name="back_url" value={page.url.searchParams.get('back_url') || ''} />
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
						<Table.Head class="max-w-[30%]">Alat</Table.Head>
						<Table.Head>Gudang</Table.Head>
						<Table.Head>Kondisi</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Mutasi Terakhir</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.equipment as item, i (item.id)}
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
							<Table.Cell class="max-w-[30%] break-words whitespace-normal">
								<div class="flex flex-col gap-1">
									<span class="line-clamp-2 font-semibold text-foreground md:line-clamp-none"
										>{item.itemName}</span
									>
									<code
										class="w-fit rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] md:text-xs"
									>
										{item.serialNumber || '-'}
									</code>
								</div>
							</Table.Cell>
							<Table.Cell>
								<div class="flex items-center gap-1.5 text-sm">
									<Package class="size-3.5 text-muted-foreground" />
									<span class="max-w-[120px] truncate" title={item.warehouseName}
										>{item.warehouseName || 'Tanpa Gudang'}</span
									>
								</div>
							</Table.Cell>
							<Table.Cell>
								<Badge
									variant="outline"
									class="whitespace-nowrap {conditionColors[item.condition]}"
								>
									{conditionLabels[item.condition] || item.condition}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="secondary" class="whitespace-nowrap {statusColors[item.status]}">
									{statusLabels[item.status] || item.status}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								{#if item.lastMovement}
									<div class="flex min-w-[100px] flex-col gap-0.5">
										<span class="text-xs font-semibold text-primary">
											{eventTypeLabels[item.lastMovement.eventType] || item.lastMovement.eventType}
										</span>
										<span class="text-[10px] text-muted-foreground">
											{new Date(item.lastMovement.createdAt).toLocaleDateString('id-ID')}
										</span>
									</div>
								{:else}
									<span class="text-xs text-muted-foreground italic">Belum ada data</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right">
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Ellipsis class="size-4" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end" class="w-48">
										<DropdownMenu.Item
											onclick={() => goto(`/${page.params.org_slug}/alat/${data.type}/${item.id}`)}
											class="gap-2"
										>
											<Info class="size-4" /> Lihat Detail
										</DropdownMenu.Item>
										<DropdownMenu.Item onclick={() => openMutate(item.id)} class="gap-2">
											<ArrowRightLeft class="size-4" /> Mutasi (Klasifikasi)
										</DropdownMenu.Item>
										<DropdownMenu.Item
											onclick={() =>
												goto(`/${page.params.org_slug}/alat/${data.type}/edit/${item.id}`)}
											class="gap-2"
										>
											<Pencil class="size-4" /> Edit Data
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item
											onclick={() => confirmDelete(item.id)}
											class="gap-2 text-red-600"
										>
											<Trash2 class="size-4" /> Hapus Alat
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={8} class="h-32 text-center text-muted-foreground italic">
								Tidak ada data {typeLabel.toLowerCase()} ditemukan.
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
						href="?page={data.pagination.currentPage - 1}&q={data.filters
							.q}&back_url={encodeURIComponent(page.url.searchParams.get('back_url') || '')}"
					>
						Sebelumnya
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={data.pagination.currentPage >= data.pagination.totalPages}
						href="?page={data.pagination.currentPage + 1}&q={data.filters
							.q}&back_url={encodeURIComponent(page.url.searchParams.get('back_url') || '')}"
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
		return ({ result }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = 'Sukses menghapus alat';
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
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
	title="Hapus Alat"
	description="Konfirmasi penghapusan alat. Tindakan ini permanen."
	actionLabel="Hapus Alat"
	onAction={() => document.getElementById('delete-form').requestSubmit()}
/>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
