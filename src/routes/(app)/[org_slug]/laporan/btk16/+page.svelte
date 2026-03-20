<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Card } from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	let searchQuery = $state('');
	let selectedTahun = $state(data.filters.tahun);
	let selectedTriwulan = $state(data.filters.triwulan);

	let filteredData = $derived(
		data.reportData.filter((item) =>
			item.namaMaterial.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
</script>

<div class="flex h-screen bg-gray-50">
	<main class="flex-1 overflow-y-auto p-8">
		<div class="mb-8 flex items-end justify-between">
			<h1 class="text-3xl font-bold tracking-tight text-gray-900">LAP BTK – 16</h1>

			<div class="flex items-end gap-4">
				<div class="space-y-1.5">
					<h1 class="ml-1 text-sm font-bold">Tahun</h1>
					<Select.Root type="single" bind:value={selectedTahun}>
						<Select.Trigger class="w-[120px] bg-white">Tahun</Select.Trigger>
						<Select.Content>
							<Select.Item value="2026">2026</Select.Item>
							<Select.Item value="2025">2025</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1.5">
					<h1 class="ml-1 text-sm font-bold">Triwulan</h1>
					<Select.Root type="single" bind:value={selectedTriwulan}>
						<Select.Trigger class="w-[160px] bg-white">Pilih Triwulan</Select.Trigger>
						<Select.Content>
							<Select.Item value="Triwulan I">Triwulan I</Select.Item>
							<Select.Item value="Triwulan II">Triwulan II</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1.5">
					<h1 class="ml-1 text-sm font-bold">Urutkan</h1>
					<Select.Root type="single" value="Terlama">
						<Select.Trigger class="w-[140px] bg-white">Urutan</Select.Trigger>
						<Select.Content>
							<Select.Item value="Terlama">Terlama</Select.Item>
							<Select.Item value="Terbaru">Terbaru</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>

		<Card class="overflow-hidden rounded-2xl border-none shadow-sm">
			<div class="flex items-center justify-between gap-4 border-b bg-white p-4">
				<div class="flex flex-1 items-center gap-4">
					<span class="text-sm font-bold whitespace-nowrap text-gray-700"
						>Tabel Laporan Jumlah Stok</span
					>
					<div class="relative w-full max-w-sm">
						<Input
							placeholder="Cari..."
							bind:value={searchQuery}
							class="h-9 border-gray-200 bg-gray-50 pr-10 pl-3"
						/>
						<span class="absolute top-2 right-3 text-gray-400">🔍</span>
					</div>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" class="h-9 border-gray-200"
						>Tampilkan Semua Kolom ▼</Button
					>
					<Button variant="outline" size="sm" class="h-9 border-gray-200">5 Kolom ▼</Button>
				</div>
			</div>

			<div class="overflow-x-auto">
				<Table.Root class="border-collapse">
					<Table.Header class="bg-gray-50/50">
						<Table.Row class="border-b hover:bg-transparent">
							<Table.Head colspan={2} class="border-r py-4 text-center font-bold text-black"
								>Nomor</Table.Head
							>
							<Table.Head rowspan={2} class="border-r px-4 text-center font-bold text-black"
								>No Kat/ Kode</Table.Head
							>
							<Table.Head
								rowspan={2}
								class="min-w-[200px] border-r text-center font-bold text-black"
								>Nama Material</Table.Head
							>
							<Table.Head rowspan={2} class="border-r text-center font-bold text-black"
								>Merek/Type</Table.Head
							>
							<Table.Head rowspan={2} class="border-r text-center font-bold text-black"
								>Satuan</Table.Head
							>
							<Table.Head rowspan={2} class="border-r text-center font-bold text-black"
								>No Senjata</Table.Head
							>
							<Table.Head colspan={3} class="border-r text-center font-bold text-black"
								>Kondisi</Table.Head
							>
							<Table.Head rowspan={2} class="px-8 text-center font-bold text-black">Ket</Table.Head>
						</Table.Row>
						<Table.Row
							class="bg-white text-center text-[10px] font-bold text-gray-600 uppercase hover:bg-transparent"
						>
							<Table.Head class="w-10 border-t border-r text-center">URT<br />1</Table.Head>
							<Table.Head class="w-10 border-t border-r text-center">SAT<br />2</Table.Head>
							<Table.Head class="border-t border-r bg-gray-50 text-center">3</Table.Head>
							<Table.Head class="border-t border-r bg-gray-50 text-center">4</Table.Head>
							<Table.Head class="border-t border-r bg-gray-50 text-center">5</Table.Head>
							<Table.Head class="border-t border-r bg-gray-50 text-center">6</Table.Head>
							<Table.Head class="border-t border-r bg-gray-50 text-center">7</Table.Head>
							<Table.Head class="border-t border-r py-2 text-center font-black">B<br />8</Table.Head
							>
							<Table.Head class="border-t border-r text-center font-black">RR<br />9</Table.Head>
							<Table.Head class="border-t border-r text-center font-black">RB<br />10</Table.Head>
							<Table.Head class="border-t text-center font-bold">11</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body class="bg-white">
						{#each filteredData as row, i}
							<Table.Row class="h-16 border-b text-center last:border-0 hover:bg-gray-50/50">
								<Table.Cell class="border-r">{i + 1}.</Table.Cell>
								<Table.Cell class="border-r"></Table.Cell>
								<Table.Cell class="border-r font-mono text-xs text-gray-500"
									>{row.kodeKatalog}</Table.Cell
								>
								<Table.Cell class="border-r px-4 text-left font-medium"
									>{row.namaMaterial}</Table.Cell
								>
								<Table.Cell class="border-r text-gray-600">{row.merekType}</Table.Cell>
								<Table.Cell class="border-r whitespace-nowrap"
									>{row.baik + row.rusakRingan + row.rusakBerat} {row.satuan}</Table.Cell
								>
								<Table.Cell class="border-r">-</Table.Cell>
								<Table.Cell class="border-r font-bold">{row.baik}</Table.Cell>
								<Table.Cell class="border-r font-bold">{row.rusakRingan}</Table.Cell>
								<Table.Cell class="border-r font-bold">{row.rusakBerat}</Table.Cell>
								<Table.Cell></Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>

			<div class="flex items-center justify-between bg-white p-6">
				<p class="text-sm text-gray-500 italic">
					Menampilkan {filteredData.length} dari {data.reportData.length} data
				</p>
				<Button
					class="h-11 rounded-full bg-[#2D5A47] px-8 font-semibold text-white transition-all hover:bg-[#1E3D30]"
				>
					Cetak Data
				</Button>
			</div>
		</Card>
	</main>
</div>
