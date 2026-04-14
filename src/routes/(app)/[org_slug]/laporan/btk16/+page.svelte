<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import type { PageData } from './$types';
	import * as XLSX from 'xlsx';
	import { Download, FileSpreadsheet, Search } from '@lucide/svelte';

	let { data } = $props<{ data: PageData }>();

	let searchQuery = $state('');
	let selectedTahun = $state(data.filters.tahun);
	let selectedTriwulan = $state(data.filters.triwulan);

	let filteredData = $derived(
		data.reportData.filter((item) =>
			item.jenisMaterial.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function exportToExcel() {
		const worksheetData = filteredData.map((row, index) => ({
			No: index + 1,
			'KAT/KODE/NSN': row.kodeKatalog,
			'JENIS MATERIAL/MEREK/TYPE': `${row.jenisMaterial} - ${row.merekType || '-'}`,
			SAT: row.satuan,
			'TAHUN BUAT/PEROLEHAN': row.tahunPerolehan,
			'TOP/DSPP': row.topDspp,
			'TW LALU - B': row.twLaluBaik,
			'TW LALU - RR': row.twLaluRusakRingan,
			'TW LALU - RB': row.twLaluRusakBerat,
			'TW LALU - JML': row.twLaluJumlah,
			'TAMBAH - B': row.tambahBaik,
			'TAMBAH - RR': row.tambahRusakRingan,
			'JUMLAH - B': row.jumlahBaik,
			'JUMLAH - RR': row.jumlahRusakRingan,
			'JUMLAH - RB': row.jumlahRusakBerat,
			'JUMLAH - TOTAL': row.jumlahTotal,
			'KURANG - B': row.kurangBaik,
			'KURANG - RR': row.kurangRusakRingan,
			'KURANG - RB': row.kurangRusakBerat,
			'KURANG - JML': row.kurangJumlah,
			'SEKARANG - B': row.sekarangBaik,
			'SEKARANG - RR': row.sekarangRusakRingan,
			'SEKARANG - RB': row.sekarangRusakBerat,
			'SEKARANG - JML': row.sekarangJumlah,
			KET: row.keterangan
		}));

		const worksheet = XLSX.utils.json_to_sheet(worksheetData);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, 'LAP BTK-16');

		// Mendownload file
		XLSX.writeFile(
			workbook,
			`LAP_BTK16_${selectedTahun}_${selectedTriwulan.replace(' ', '_')}.xlsx`
		);
	}
</script>

<div class="flex h-screen p-6 bg-background text-foreground">
	<main class="flex-1 overflow-y-auto">
		<div class="mb-8 flex items-end justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">LAP BTK - 16</h1>
				<p class="text-sm text-muted-foreground">Laporan Berita Tambah Kurang Material Matkomlek</p>
			</div>

			<div class="flex items-end gap-3">
				<div class="space-y-1.5">
					<span class="text-xs font-bold text-muted-foreground uppercase">Tahun</span>
					<Select.Root type="single" bind:value={selectedTahun}>
						<Select.Trigger class="w-[100px] bg-background">{selectedTahun}</Select.Trigger>
						<Select.Content>
							<Select.Item value="2026">2026</Select.Item>
							<Select.Item value="2025">2025</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-1.5">
					<span class="text-xs font-bold text-muted-foreground uppercase">Triwulan</span>
					<Select.Root type="single" bind:value={selectedTriwulan}>
						<Select.Trigger class="w-[160px] bg-background">{selectedTriwulan}</Select.Trigger>
						<Select.Content>
							<Select.Item value="Triwulan I">Triwulan I</Select.Item>
							<Select.Item value="Triwulan II">Triwulan II</Select.Item>
							<Select.Item value="Triwulan III">Triwulan III</Select.Item>
							<Select.Item value="Triwulan IV">Triwulan IV</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<Button
					onclick={exportToExcel}
					class="h-10 gap-2 bg-success text-success-foreground hover:bg-success/90"
				>
					<FileSpreadsheet size={18} />
					Export Excel
				</Button>
			</div>
		</div>

		<div class="mb-4 flex items-center justify-between gap-4 rounded-lg border bg-muted/50 p-3">
			<div class="relative w-full max-w-sm">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					placeholder="Cari material..."
					bind:value={searchQuery}
					class="h-9 border-border bg-background pl-10"
				/>
			</div>
			<div class="text-sm font-medium text-muted-foreground">
				Menampilkan {filteredData.length} Material
			</div>
		</div>

		<div class="overflow-x-auto rounded-lg border bg-card shadow-sm">
			<Table.Root class="border-collapse text-xs">
				<Table.Header class="bg-muted/50">
					<!-- Baris 1: Judul Utama -->
					<Table.Row class="hover:bg-transparent">
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>NO</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>KAT/KODE/NSN</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>JENIS MATERIAL / MEREK TYPE</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>SAT</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>THN BUAT / PEROLEHAN</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>TOP/ DSPP</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" rowspan={2}
							>TW LALU</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground" colspan={3}
							>JUMLAH</Table.Head
						>

						<!-- <Table.Head class="border-b text-center font-bold text-foreground" rowspan={2}
							>KET</Table.Head
						> -->
					</Table.Row>

					<Table.Row>
						<Table.Head class="border-r border-b text-center font-bold text-foreground"
							>TAMBAH</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground"
							>KURANG</Table.Head
						>
						<Table.Head class="border-r border-b text-center font-bold text-foreground"
							>SEKARANG</Table.Head
						>
					</Table.Row>

					<!-- Baris 2: Sub Judul -->
					<!-- <Table.Row class="hover:bg-transparent">
						<Table.Head class="border-r border-b text-center font-bold">B</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RR</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RB</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">JML</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">B</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RR</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">B</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RR</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RB</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">JML</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">B</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RR</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RB</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">JML</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">B</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RR</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">RB</Table.Head>
						<Table.Head class="border-r border-b text-center font-bold">JML</Table.Head>
					</Table.Row> -->

					<!-- Baris 3: Penomoran Kolom (1 - 26) -->
					<Table.Row class="bg-muted hover:bg-transparent">
						{#each Array(10) as _, i}
							<Table.Head class="border-r border-b py-1 text-center font-bold text-foreground"
								>{i + 1}</Table.Head
							>
						{#/each}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredData as row, i}
						<Table.Row class="hover:bg-muted/30">
							<Table.Cell class="border-r text-center">{i + 1}</Table.Cell>
							<Table.Cell class="border-r font-mono">{row.kodeKatalog}</Table.Cell>
							<Table.Cell class="border-r px-3">
								<div class="font-bold">{row.jenisMaterial}</div>
								<div class="text-[10px] text-muted-foreground">{row.merekType || '-'}</div>
							</Table.Cell>
							<Table.Cell class="border-r text-center">{row.satuan}</Table.Cell>
							<Table.Cell class="border-r text-center">{row.tahunPerolehan}</Table.Cell>
							<Table.Cell class="border-r text-center">{row.topDspp}</Table.Cell>
							<!-- TW LALU -->
							<!-- <Table.Cell class="border-r text-center">{row.twLaluBaik}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.twLaluRusakRingan}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.twLaluRusakBerat}</Table.Cell> -->
							<Table.Cell class="border-r bg-muted/20 text-center font-bold"
								>{row.twLaluJumlah}</Table.Cell
							>
							<!-- TAMBAH -->
							<Table.Cell class="border-r text-center text-success">{row.tambahBaik}</Table.Cell>
							<!-- <Table.Cell class="border-r text-center text-success"
								>{row.tambahRusakRingan}</Table.Cell
							> -->
							<!-- JUMLAH -->
							<!-- <Table.Cell class="border-r text-center">{row.jumlahBaik}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.jumlahRusakRingan}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.jumlahRusakBerat}</Table.Cell> -->
							<!-- <Table.Cell class="border-r bg-muted/20 text-center font-bold">{row.jumlahTotal}</Table.Cell> -->
							<!-- KURANG -->
							<!-- <Table.Cell class="border-r text-center text-destructive">{row.kurangBaik}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center text-destructive">{row.kurangRusakRingan}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center text-destructive">{row.kurangRusakBerat}</Table.Cell> -->
							<Table.Cell class="border-r bg-muted/20 text-center font-bold text-destructive"
								>{row.kurangJumlah}</Table.Cell
							>
							<!-- SEKARANG -->
							<!-- <Table.Cell class="border-r text-center font-bold">{row.sekarangBaik}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.sekarangRusakRingan}</Table.Cell> -->
							<!-- <Table.Cell class="border-r text-center">{row.sekarangRusakBerat}</Table.Cell> -->
							<Table.Cell class="border-r bg-primary/10 text-center font-bold"
								>{row.sekarangJumlah}</Table.Cell
							>
							<!-- <Table.Cell class="text-center">{row.keterangan}</Table.Cell> -->
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={26} class="h-24 text-center text-muted-foreground">
								Tidak ada data material untuk periode ini.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</main>
</div>
