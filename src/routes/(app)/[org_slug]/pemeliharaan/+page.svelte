<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import {
		Wrench,
		Plus,
		Search,
		Calendar,
		Trash2,
		Edit,
		Clock,
		CheckCircle2,
		AlertCircle,
		Box,
		Filter
	} from '@lucide/svelte';

	let { data } = $props();

	// State untuk filter
	let selectedEquipmentIds = $state(data.filters.equipmentIds);

	$effect(() => {
		const url = new URL(window.location.href);
		const currentEqIds = url.searchParams.get('equipmentIds')?.split(',').filter(Boolean) || [];
		
		if (JSON.stringify(currentEqIds.sort()) !== JSON.stringify(selectedEquipmentIds.slice().sort())) {
			if (selectedEquipmentIds.length > 0) {
				url.searchParams.set('equipmentIds', selectedEquipmentIds.join(','));
			} else {
				url.searchParams.delete('equipmentIds');
			}
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}
	});

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

	function getStatusColor(status: string) {
		switch (status) {
			case 'COMPLETED':
				return 'bg-success/10 text-success border-success/20';
			case 'IN_PROGRESS':
				return 'bg-primary/10 text-primary border-primary/20';
			case 'PENDING':
				return 'bg-secondary/10 text-secondary border-secondary/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'COMPLETED':
				return CheckCircle2;
			case 'IN_PROGRESS':
				return Clock;
			case 'PENDING':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}

	function formatDate(date: string | Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}
</script>

<svelte:head>
	<title>Pemeliharaan Alat | MINMAT</title>
</svelte:head>

<div class="space-y-8 p-6">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Manajemen Pemeliharaan</h1>

			<p class="text-muted-foreground">Kelola jadwal perawatan dan perbaikan peralatan matkomlek</p>
		</div>

		<Button
			href="/{data.org_slug}/pemeliharaan/create"
			class="gap-2 bg-primary text-primary-foreground shadow-sm transition-all hover:translate-y-[-1px] hover:bg-primary/90"
		>
			<Plus size={18} />
			Tambah Pemeliharaan
		</Button>
	</div>

	<div class="flex flex-col items-center justify-between gap-4 md:flex-row">
		<div class="flex w-full flex-wrap gap-3 md:w-auto">
			<div class="relative flex-1 md:w-64">
				<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={16} />
				<input
					type="text"
					placeholder="Cari deskripsi..."
					class="w-full rounded-xl border border-border bg-card py-2 pr-4 pl-10 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-ring"
				/>
			</div>

			<!-- Filter Peralatan Multi-select -->
			<div class="w-full md:w-64">
				<SearchableSelect.Root type="multiple" bind:value={selectedEquipmentIds}>
					<SearchableSelect.Trigger
						class="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent"
					>
						<div class="flex items-center gap-2 overflow-hidden">
							<Filter size={16} class="text-muted-foreground shrink-0" />
							{#if selectedEquipmentIds.length === 0}
								<span class="text-muted-foreground truncate">Filter Peralatan</span>
							{:else}
								<span class="text-foreground font-medium truncate"
									>{selectedEquipmentIds.length} Alat</span
								>
							{/if}
						</div>
					</SearchableSelect.Trigger>
					<SearchableSelect.Content>
						{#each data.equipment as eq (eq.id)}
							<SearchableSelect.Item
								value={eq.id}
								label={`${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`}
							>
								<div class="flex flex-col">
									<span class="font-medium text-xs">{eq.item?.name || 'Tanpa Nama'}</span>
									{#if eq.serialNumber}
										<span class="text-[10px] text-muted-foreground">SN: {eq.serialNumber}</span>
									{/if}
								</div>
							</SearchableSelect.Item>
						{/each}
					</SearchableSelect.Content>
				</SearchableSelect.Root>
			</div>

			<button
				class="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
			>
				<Calendar size={16} />
				<span class="hidden sm:inline">Filter Tanggal</span>
			</button>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
		<Table.Root>
			<Table.Header class="bg-muted/50">
				<Table.Row>
					<Table.Head class="w-[300px]">Peralatan</Table.Head>
					<Table.Head>Tipe</Table.Head>
					<Table.Head>Deskripsi</Table.Head>
					<Table.Head>Jadwal</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.maintenance as item (item.id)}
					<Table.Row class="group transition-colors hover:bg-accent/50">
						<Table.Cell>
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary"
								>
									<Box size={20} />
								</div>
								<div class="flex flex-col">
									<span class="leading-tight font-bold text-foreground"
										>{item.equipment?.item?.name ?? item.equipmentId}</span
									>
									<span class="mt-1 font-mono text-[10px] text-muted-foreground"
										>SN: {item.equipment?.serialNumber || '-'}</span
									>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge
								variant="outline"
								class="border-border bg-muted text-[10px] font-bold tracking-wider text-muted-foreground uppercase"
							>
								{item.maintenanceType}
							</Badge>
						</Table.Cell>
						<Table.Cell class="max-w-xs">
							<p class="truncate text-sm text-muted-foreground italic">"{item.description}"</p>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-col">
								<span class="text-sm font-medium text-foreground"
									>{formatDate(item.scheduledDate)}</span
								>
							</div>
						</Table.Cell>
						<Table.Cell>
							{@const StatusIcon = getStatusIcon(item.status)}
							<Badge variant="outline" class="gap-1.5 px-3 py-1 {getStatusColor(item.status)}">
								<StatusIcon size={14} />
								{item.status}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-right">
							<div class="flex justify-end gap-1">
								<Button
									size="icon"
									variant="ghost"
									href="/{data.org_slug}/pemeliharaan/{item.id}/edit"
									class="h-8 w-8 text-muted-foreground hover:text-primary"
								>
									<Edit size={16} />
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
										size="icon"
										variant="ghost"
										type="button"
										onclick={() => confirmDelete(item.id, deleteForm!)}
										class="h-8 w-8 text-muted-foreground hover:text-destructive"
									>
										<Trash2 size={16} />
									</Button>
								</form>
							</div>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-64 text-center">
							<div class="flex flex-col items-center justify-center text-muted-foreground gap-3">
								<Wrench size={48} strokeWidth={1} class="text-border" />
								<p class="text-sm">Belum ada data pemeliharaan yang tercatat</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div
			class="flex items-center justify-between border-t border-border bg-muted/30 p-4 text-xs font-medium text-muted-foreground"
		>
			<span>Total {data.maintenance.length} jadwal pemeliharaan</span>
		</div>
	</div>

	<!-- Dialog Konfirmasi Hapus -->
	<ConfirmationDialog
		bind:open={showDeleteDialog}
		type="error"
		title="Hapus Pemeliharaan"
		description="Apakah Anda yakin ingin menghapus data pemeliharaan ini? Tindakan ini akan menghapus riwayat dari sistem dan tidak dapat dikembalikan."
		cancelLabel="Batal"
		actionLabel="Ya, Hapus"
		onAction={handleDelete}
		onCancel={handleCancelDelete}
	/>
</div>
