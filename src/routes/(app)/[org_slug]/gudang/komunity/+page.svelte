<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { CardTitle } from '$lib/components/ui/card';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import { Label } from '$lib/components/ui/label';
	import { Search, ChevronLeft, ChevronRight, Building2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let searchQuery = $state('');
	let currentPage = $state(1);
	let itemsPerPage = $state(10);

	let filteredItems = $derived(
		data.items.filter(
			(item) =>
				item.namaBarang?.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.matkomplek?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let totalItems = $derived(filteredItems.length);
	let totalPages = $derived(Math.ceil(totalItems / itemsPerPage));
	let paginatedItems = $derived(
		filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
	);

	function getConditionBadge(kondisi: string) {
		const variants: Record<string, string> = {
			BAIK: 'border-success bg-success/10 text-success',
			RUSAK_RINGAN: 'border-primary bg-primary/10 text-primary',
			RUSAK_BERAT: 'border-destructive bg-destructive/10 text-destructive'
		};
		return variants[kondisi] || 'border-border bg-muted text-muted-foreground';
	}

	function getEquipmentTypeLabel(type: string | null) {
		if (type === 'ALKOMLEK') return 'Alkomlek';
		if (type === 'PERNIKA_LEK') return 'Pernika Lek';
		return 'Alat';
	}

	function handleOrgChange(val: string | undefined) {
		if (!val) return;
		const newUrl = new URL(page.url);
		newUrl.searchParams.set('orgId', val);
		goto(newUrl.toString());
	}

	let selectedOrgName = $derived(
		data.organizations.find((o) => o.id === data.selectedOrgId)?.name || 'Pilih Kesatuan'
	);
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="flex flex-col gap-1">
			<CardTitle class="text-2xl font-bold">Gudang Komunity</CardTitle>
			{#if data.isMabes}
				<p class="text-sm text-muted-foreground">
					Menampilkan data komunity dari: <span class="font-semibold text-primary"
						>{selectedOrgName}</span
					>
				</p>
			{/if}
		</div>
		<div class="flex flex-wrap items-end gap-3">
			{#if data.isMabes}
				<div class="flex flex-col gap-1.5">
					<Label for="org-filter">Filter Kesatuan</Label>
					<SearchableSelect.Root
						type="single"
						value={data.selectedOrgId}
						onValueChange={handleOrgChange}
					>
						<SearchableSelect.Trigger class="w-[250px] border border-border">
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
				<div class="relative max-w-md">
					<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id="search"
						type="text"
						placeholder="Cari SN atau nama..."
						class="w-[300px] border border-border pl-10"
						bind:value={searchQuery}
					/>
				</div>
			</div>
		</div>
	</div>

	<div class="rounded-lg bg-card shadow-sm border border-border">
		<div class="overflow-x-auto">
			<Table.Table class="w-full border-collapse">
				<Table.Header class="sticky top-0 bg-muted/50">
					<!-- First header row -->
					<Table.Row class="border-b-2 border-border">
						<!-- <Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>MATKOMPLEK</Table.Head
						> -->
						<Table.Head rowspan={2} class="border-r border-border text-center font-bold"
							>Barang</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center  font-bold"
							>Stok</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center  font-bold"
							>Masuk</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center  font-bold"
							>Keluar</Table.Head
						>
						<Table.Head class="border-r border-border text-center font-bold" colspan={3}
							>Sisa</Table.Head
						>
						<Table.Head rowspan={2} class="border-r border-border text-center  font-bold"
							>Ket</Table.Head
						>
						<Table.Head rowspan={2} class=" font-bold">Tahun</Table.Head>
					</Table.Row>

					<!-- Second header row (sub-headers) -->
					<Table.Row class="border-b-2 border-border bg-muted">
						<Table.Head class="border-r border-border text-center font-semibold">B</Table.Head>
						<Table.Head class="border-r border-border text-center font-semibold">RR</Table.Head>
						<Table.Head class="border-r border-border text-center font-semibold">RB</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if paginatedItems.length === 0}
						<Table.Row>
							<Table.Cell colspan={12} class="border border-border py-8 text-center text-muted-foreground">
								Tidak ada data
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each paginatedItems as item (item.id)}
							<Table.Row class="border-b border-border hover:bg-muted/50">
								<!-- <Table.Cell class="border-r border-border font-mono text-sm">
									{item.matkomplek}
								</Table.Cell> -->

								<Table.Cell class="border-r border-border">
									<div class="font-semibold">{item.namaBarang}</div>
									<div class="text-xs text-muted-foreground">
										<!-- {getEquipmentTypeLabel(item.equipmentType)} -->
										{item.matkomplek}
									</div>
								</Table.Cell>

								<Table.Cell class="border-r border-border  font-semibold">
									{item.stok}
								</Table.Cell>

								<Table.Cell class="border-r border-border  text-success">
									{item.masuk}
								</Table.Cell>

								<Table.Cell class="border-r border-border  text-destructive">
									{item.keluar}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center font-semibold">
									{item.sisaBaik}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center text-primary">
									{item.sisaRR}
								</Table.Cell>

								<Table.Cell class="border-r border-border text-center text-destructive">
									{item.sisaRB}
								</Table.Cell>

								<Table.Cell class="border-r border-border">
									{item.keterangan}
								</Table.Cell>

								<Table.Cell class="">
									{item.tahun}
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Table>
		</div>

		<!-- Pagination -->
		{#if totalPages > 0}
			<div class="flex items-center justify-between rounded-b-lg border-t border-border px-6 py-4">
				<div class="text-sm text-muted-foreground">
					Menampilkan <span class="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> -
					<span class="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
					dari <span class="font-semibold text-foreground">{totalItems}</span> data
				</div>
				<div class="flex gap-2">
					<button
						class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => (currentPage = Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
					>
						<ChevronLeft class="mr-1 inline h-4 w-4" />
						Sebelumnya
					</button>
					<button
						class="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
						onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
					>
						Selanjutnya
						<ChevronRight class="ml-1 inline h-4 w-4" />
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
