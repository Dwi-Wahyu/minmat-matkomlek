<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Search, ChevronLeft, ChevronRight } from '@lucide/svelte';

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
			BAIK: 'border-green-500 bg-green-50 text-green-600',
			RUSAK_RINGAN: 'border-yellow-500 bg-yellow-50 text-yellow-600',
			RUSAK_BERAT: 'border-red-500 bg-red-50 text-red-600'
		};
		return variants[kondisi] || 'border-gray-500 bg-gray-50 text-gray-600';
	}

	function getEquipmentTypeLabel(type: string | null) {
		if (type === 'ALKOMLEK') return 'Alkomlek';
		if (type === 'PERNIKA_LEK') return 'Pernika Lek';
		return 'Alat';
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<CardTitle class="text-2xl font-bold">Gudang Komunity</CardTitle>
		<div class="flex flex-wrap gap-3">
			<div class="relative max-w-md">
				<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Cari berdasarkan SN atau nama barang..."
					class="w-[300px] border-2 pl-10"
					bind:value={searchQuery}
				/>
			</div>
		</div>
	</div>

	<div class="overflow-x-auto">
		<Table.Table class="w-full border-collapse">
			<Table.Header class="sticky top-0">
				<!-- First header row -->
				<Table.Row class="border-b-2 border-gray-300">
					<!-- <Table.Head rowspan={2} class="border-r border-gray-200 text-center font-bold"
						>MATKOMPLEK</Table.Head
					> -->
					<Table.Head rowspan={2} class="border-r border-gray-200 text-center font-bold"
						>Barang</Table.Head
					>
					<Table.Head rowspan={2} class="border-r border-gray-200 text-center  font-bold"
						>Stok</Table.Head
					>
					<Table.Head rowspan={2} class="border-r border-gray-200 text-center  font-bold"
						>Masuk</Table.Head
					>
					<Table.Head rowspan={2} class="border-r border-gray-200 text-center  font-bold"
						>Keluar</Table.Head
					>
					<Table.Head class="border-r border-gray-200 text-center font-bold" colspan={3}
						>Sisa</Table.Head
					>
					<Table.Head rowspan={2} class="border-r border-gray-200 text-center  font-bold"
						>Ket</Table.Head
					>
					<Table.Head rowspan={2} class=" font-bold">Tahun</Table.Head>
				</Table.Row>

				<!-- Second header row (sub-headers) -->
				<Table.Row class="border-b-2 border-gray-300 bg-gray-50">
					<Table.Head class="border-r border-gray-200 text-center font-semibold">B</Table.Head>
					<Table.Head class="border-r border-gray-200 text-center font-semibold">RR</Table.Head>
					<Table.Head class="border-r border-gray-200 text-center font-semibold">RB</Table.Head>
				</Table.Row>
			</Table.Header>

			<Table.Body>
				{#if paginatedItems.length === 0}
					<Table.Row>
						<Table.Cell colspan={12} class="border py-8 text-center text-gray-500">
							Tidak ada data
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each paginatedItems as item, idx}
						<Table.Row class="border-b border-gray-200 hover:bg-gray-50">
							<!-- <Table.Cell class="border-r border-gray-200 font-mono text-sm">
								{item.matkomplek}
							</Table.Cell> -->

							<Table.Cell class="border-r border-gray-200">
								<div class="font-semibold">{item.namaBarang}</div>
								<div class="text-xs text-muted-foreground">
									<!-- {getEquipmentTypeLabel(item.equipmentType)} -->
									{item.matkomplek}
								</div>
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200  font-semibold">
								{item.stok}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200  text-green-600">
								{item.masuk}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200  text-red-600">
								{item.keluar}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200 text-center font-semibold">
								{item.sisaBaik}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200 text-center text-yellow-600">
								{item.sisaRR}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200 text-center text-red-600">
								{item.sisaRB}
							</Table.Cell>

							<Table.Cell class="border-r border-gray-200">
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
		<div class="flex items-center justify-between border-t bg-gray-50 px-6 py-4">
			<div class="text-sm text-gray-600">
				Menampilkan <span class="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> -
				<span class="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span>
				dari <span class="font-semibold">{totalItems}</span> data
			</div>
			<div class="flex gap-2">
				<button
					class="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
					onclick={() => (currentPage = Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
				>
					<ChevronLeft class="mr-1 inline h-4 w-4" />
					Sebelumnya
				</button>
				<button
					class="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
