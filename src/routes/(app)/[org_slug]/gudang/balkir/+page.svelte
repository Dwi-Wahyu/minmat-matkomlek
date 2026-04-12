<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import { Label } from '$lib/components/ui/label';
	import { Search, Box, HardDrive, Building2 } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	let searchQuery = $state('');

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

	let selectedOrgName = $derived(
		data.organizations.find((o) => o.id === data.selectedOrgId)?.name || 'Pilih Kesatuan'
	);
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<header class="flex flex-col gap-1">
			<h1 class="text-2xl font-bold tracking-tight">Gudang Balkir</h1>
			{#if data.isMabes}
				<p class="text-sm text-muted-foreground">
					Menampilkan data balkir dari: <span class="font-semibold text-primary"
						>{selectedOrgName}</span
					>
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

	<div class="rounded-lg bg-card shadow-sm">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Nama Item</Table.Head>
					<Table.Head>Kuantitas</Table.Head>
					<Table.Head>Asal</Table.Head>
					<Table.Head>Ket</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredItems as item (item.id)}
					<Table.Row>
						<Table.Cell>
							<div class="font-semibold">{item.nama}</div>
						</Table.Cell>
						<Table.Cell>
							<span class="text-lg">{Number(item.qty)}</span>
							<span class="ml-1 text-xs text-muted-foreground">{item.satuan}</span>
						</Table.Cell>
						<Table.Cell>
							{item.fromWarehouse ?? '-'}
						</Table.Cell>
						<Table.Cell class="text-sm">
							{item.lokasi}
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
							Data stok tidak ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
