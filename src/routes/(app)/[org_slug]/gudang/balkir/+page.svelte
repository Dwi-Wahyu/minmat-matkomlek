<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Search, Box, HardDrive } from '@lucide/svelte';

	let { data } = $props();

	let searchQuery = $state('');

	let filteredItems = $derived(
		data.movements.filter(
			(item) =>
				item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(item.sn && item.sn.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);
</script>

<div class="flex flex-col gap-6">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold tracking-tight">Gudang Balkir</h1>
	</header>

	<div class="flex items-center gap-4">
		<div class="relative max-w-md flex-1">
			<Search class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Cari nama barang atau nomor seri..."
				class="pl-10"
				bind:value={searchQuery}
			/>
		</div>
	</div>

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
						<span class="text-lg">{item.qty}</span>
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
