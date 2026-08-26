<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { RotateCw, Building2 } from '@lucide/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { getBtk16Data } from './btk-16.remote';
	import { untrack } from 'svelte';
	import {
		SearchableSelect,
		SearchableSelectContent,
		SearchableSelectItem,
		SearchableSelectTrigger
	} from '$lib/components/ui/searchable-select';

	let { data }: { data: any } = $props();

	// Reactivity States
	let reportType = $state<'TRIWULAN' | 'NOMINATIF' | 'BULANAN'>(
		(page.url.searchParams.get('reportType') as any) || 'TRIWULAN'
	);
	let periodStr = $state(page.url.searchParams.get('periodStr') || '');
	let categoryId = $state(page.url.searchParams.get('categoryId') || '');
	let currentPage = $state(Number(page.url.searchParams.get('page') || '1'));
	let limit = $state(Number(page.url.searchParams.get('limit') || '20'));

	// Sync states to URL search params
	$effect(() => {
		const type = reportType;
		const period = periodStr;
		const cat = categoryId;
		const p = currentPage;
		const lim = limit;

		untrack(() => {
			const url = new URL(window.location.href);
			url.searchParams.set('reportType', type);
			url.searchParams.set('periodStr', period);
			url.searchParams.set('categoryId', cat || '');
			url.searchParams.set('page', String(p));
			url.searchParams.set('limit', String(lim));
			goto(url.toString(), { replaceState: true, noScroll: true });
		});
	});

	// Auto-assign default period format when reportType changes
	$effect(() => {
		const type = reportType;
		untrack(() => {
			const currentParamPeriod = page.url.searchParams.get('periodStr');
			const currentParamType = page.url.searchParams.get('reportType');
			if (currentParamPeriod && currentParamType === type) {
				periodStr = currentParamPeriod;
				return;
			}
			const now = new Date();
			const year = now.getFullYear();
			if (type === 'TRIWULAN') {
				const month = now.getMonth();
				const q = Math.floor(month / 3) + 1;
				periodStr = `${year}-Q${q}`;
			} else {
				const month = String(now.getMonth() + 1).padStart(2, '0');
				periodStr = `${year}-${month}`;
			}
		});
	});

	// Reset page on filter changes (if filter params change, reset page to 1)
	$effect(() => {
		const _type = reportType;
		const _period = periodStr;
		const _cat = categoryId;
		const _limit = limit;
		untrack(() => {
			const pParam = Number(page.url.searchParams.get('page') || '1');
			const tParam = page.url.searchParams.get('reportType') || 'TRIWULAN';
			const peParam = page.url.searchParams.get('periodStr') || '';
			const cParam = page.url.searchParams.get('categoryId') || '';
			const lParam = Number(page.url.searchParams.get('limit') || '20');

			// Only reset page to 1 if one of the filters actually changed from URL state
			if (tParam !== _type || peParam !== _period || cParam !== _cat || lParam !== _limit) {
				currentPage = 1;
			}
		});
	});

	// Reactive remote query
	const btkQuery = $derived(
		getBtk16Data({
			reportType,
			periodStr,
			categoryId: categoryId || undefined,
			page: currentPage,
			limit
		})
	);

	// Predefined Triwulan values
	const triwulanOptions = [
		{ value: '2026-Q1', label: '2026 - Triwulan I' },
		{ value: '2026-Q2', label: '2026 - Triwulan II' },
		{ value: '2026-Q3', label: '2026 - Triwulan III' },
		{ value: '2026-Q4', label: '2026 - Triwulan IV' },
		{ value: '2025-Q1', label: '2025 - Triwulan I' },
		{ value: '2025-Q2', label: '2025 - Triwulan II' },
		{ value: '2025-Q3', label: '2025 - Triwulan III' },
		{ value: '2025-Q4', label: '2025 - Triwulan IV' }
	];

	import * as XLSX from 'xlsx';
	import { toast } from 'svelte-sonner';

	async function exportXLSX() {
		try {
			toast.info('Menyiapkan seluruh data laporan untuk diekspor...');
			const fullData = await getBtk16Data({
				reportType,
				periodStr,
				categoryId,
				page: 1,
				limit: 999999
			});

			if (!fullData || !fullData.reports || !fullData.reports.length) {
				toast.error('Tidak ada data untuk diekspor');
				return;
			}

			let headers: string[] = [];
			if (reportType === 'NOMINATIF') {
				headers = [
					'NO',
					'KAT/KODE',
					'TAHUN PEROLEHAN',
					'JENIS MATERIEL',
					'MERK/TYPE',
					'SATUAN',
					'NO SERI',
					'JUMLAH',
					'B',
					'RR',
					'RB',
					'LOKASI',
					'KETERANGAN'
				];
			} else if (reportType === 'TRIWULAN') {
				headers = [
					'NO',
					'KAT/KODE',
					'JENIS MATERIEL',
					'SAT',
					'TOP',
					'TW LALU',
					'TAMBAH',
					'KURANG',
					'SEKARANG',
					'B',
					'RR',
					'RB',
					'LOKASI',
					'KETERANGAN'
				];
			} else {
				headers = [
					'NO',
					'KAT/KODE',
					'JENIS MATERIEL',
					'SATUAN',
					'JUMLAH',
					'B',
					'RR',
					'RB',
					'KETERANGAN'
				];
			}

			const rows: any[] = [];
			let globalIndex = 0;

			for (const mainCat of fullData.reports) {
				const mainRow = Array(headers.length).fill('');
				mainRow[0] = 'KATEGORI';
				mainRow[2] = mainCat.name;
				rows.push(mainRow);

				for (const subCat of mainCat.subCategories) {
					const subRow = Array(headers.length).fill('');
					subRow[0] = 'SUB KATEGORI';
					subRow[2] = `  ↳ ${subCat.name}`;
					rows.push(subRow);

					for (const item of subCat.items) {
						if (reportType === 'NOMINATIF') {
							for (const eq of item.equipments || []) {
								globalIndex++;
								rows.push([
									globalIndex,
									item.itemId,
									eq.year || '-',
									item.itemName,
									eq.brand || '-',
									item.baseUnit,
									eq.serialNumber,
									1,
									eq.condition === 'BAIK' ? '1' : '0',
									eq.condition === 'RUSAK_RINGAN' ? '1' : '0',
									['RUSAK_BERAT', 'RUSAK_TOTAL'].includes(eq.condition) ? '1' : '0',
									eq.statusInfo,
									''
								]);
							}
						} else if (reportType === 'TRIWULAN') {
							globalIndex++;
							rows.push([
								globalIndex,
								item.itemId,
								item.itemName,
								item.baseUnit,
								item.totalStock || 0,
								item.twLalu || 0,
								item.tambah || 0,
								item.kurang || 0,
								item.sekarang || 0,
								item.baik || 0,
								item.rusakRingan || 0,
								(item.rusakBerat || 0) + (item.rusakTotal || 0),
								'',
								item.keterangan || '-'
							]);
						} else if (reportType === 'BULANAN') {
							globalIndex++;
							rows.push([
								globalIndex,
								item.itemId,
								item.itemName,
								item.baseUnit,
								item.totalStock || 0,
								item.baik || 0,
								item.rusakRingan || 0,
								(item.rusakBerat || 0) + (item.rusakTotal || 0),
								item.keterangan || '-'
							]);
						}
					}
				}
			}

			const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, 'BTK-16 Report');
			XLSX.writeFile(
				wb,
				`BTK16_${reportType}_${periodStr}_${new Date().toISOString().slice(0, 10)}.xlsx`
			);
			toast.success('Laporan berhasil diekspor ke format XLSX');
		} catch (error) {
			console.error(error);
			toast.error('Gagal mengekspor laporan');
		}
	}
</script>

<div class="mx-auto max-w-7xl space-y-6 p-4 text-foreground md:p-6">
	<!-- Title & Export -->
	<div class="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1
				class="text-2xl font-black tracking-tight text-foreground uppercase underline decoration-primary decoration-4"
			>
				Laporan Kondisi Materiil
			</h1>
			<h2 class="mt-1 text-sm font-bold tracking-widest text-muted-foreground uppercase">
				( BTK - 16 )
			</h2>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<!-- Limit Rows -->
			<div class="mr-2 flex items-center gap-2">
				<span class="text-xs font-semibold text-muted-foreground">Baris:</span>
				<Select.Root
					type="single"
					value={limit.toString()}
					onValueChange={(val) => {
						if (val) {
							limit = Number(val);
						}
					}}
				>
					<Select.Trigger class="h-8 w-16 bg-card text-xs">
						{limit}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="10" label="10">10</Select.Item>
						<Select.Item value="20" label="20">20</Select.Item>
						<Select.Item value="50" label="50">50</Select.Item>
						<Select.Item value="100" label="100">100</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>

			<form
				method="POST"
				action="?/reload"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							btkQuery.refresh();
						}
					};
				}}
			>
				<Button type="submit" disabled={btkQuery.loading} variant="outline" size="sm" class="gap-2">
					<RotateCw class="h-4 w-4 {btkQuery.loading ? 'animate-spin' : ''}" />
					Muat Ulang
				</Button>
			</form>
			<Button
				onclick={exportXLSX}
				disabled={btkQuery.loading ||
					!btkQuery.current ||
					!btkQuery.current.reports ||
					btkQuery.current.reports.length === 0}
				variant="default"
				size="sm"
				class="font-semibold shadow-sm"
			>
				Ekspor XLSX
			</Button>
		</div>
	</div>

	<!-- Filters Section -->
	<div
		class="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3"
	>
		<!-- Dropdown Report Type -->
		<div class="space-y-1.5">
			<label class="text-xs font-bold text-muted-foreground uppercase" for="reportTypeSelect"
				>Tipe Laporan</label
			>
			<Select.Root
				type="single"
				value={reportType}
				onValueChange={(val) => {
					if (val) reportType = val as any;
				}}
			>
				<Select.Trigger id="reportTypeSelect" class="h-9 w-full bg-card text-xs">
					{reportType === 'TRIWULAN'
						? 'Triwulan'
						: reportType === 'NOMINATIF'
							? 'Nominatif'
							: 'Bulanan'}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="TRIWULAN" label="Triwulan">Triwulan</Select.Item>
					<Select.Item value="NOMINATIF" label="Nominatif">Nominatif</Select.Item>
					<Select.Item value="BULANAN" label="Bulanan">Bulanan</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>

		<!-- Input Periode -->
		<div class="space-y-1.5">
			<label class="text-xs font-bold text-muted-foreground uppercase" for="periodInput"
				>Periode Waktu</label
			>
			{#if reportType === 'TRIWULAN'}
				<Select.Root
					type="single"
					value={periodStr}
					onValueChange={(val) => {
						if (val) periodStr = val;
					}}
				>
					<Select.Trigger id="periodInput" class="h-9 w-full bg-card text-xs">
						{triwulanOptions.find((o) => o.value === periodStr)?.label || periodStr}
					</Select.Trigger>
					<Select.Content>
						{#each triwulanOptions as opt}
							<Select.Item value={opt.value} label={opt.label}>{opt.label}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{:else}
				<Input
					id="periodInput"
					type="month"
					bind:value={periodStr}
					class="h-9 w-full bg-card text-xs"
				/>
			{/if}
		</div>

		<!-- Filter Kategori Induk -->
		<div class="space-y-1.5">
			<label class="text-xs font-bold text-muted-foreground uppercase" for="categoryIdSelect"
				>Kategori Induk</label
			>
			<SearchableSelect type="single" bind:value={categoryId}>
				<SearchableSelectTrigger id="categoryIdSelect" class="h-9 w-full bg-card text-xs">
					{data.parentCategories?.find((c: any) => c.id === categoryId)?.name || 'Semua Kategori'}
				</SearchableSelectTrigger>
				<SearchableSelectContent>
					<SearchableSelectItem value="" label="Semua Kategori">Semua Kategori</SearchableSelectItem
					>
					{#each data.parentCategories || [] as cat (cat.id)}
						<SearchableSelectItem value={cat.id} label={cat.name}>
							{cat.name}
						</SearchableSelectItem>
					{/each}
				</SearchableSelectContent>
			</SearchableSelect>
		</div>
	</div>

	<!-- Table Area -->
	<div class="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
		<table class="w-full border-collapse text-[11px] text-foreground">
			<thead>
				<tr class="border-b border-border bg-muted/50 uppercase">
					{#if reportType === 'NOMINATIF'}
						<th class="w-12 border-r border-b px-2 py-3 text-center" rowspan="2">No Urt</th>
						<th class="w-28 border-r border-b px-2 py-3 text-center" rowspan="2">Kode Barang</th>
						<th class="w-24 border-r border-b px-2 py-3 text-center" rowspan="2">Tahun</th>
						<th class="border-r border-b px-3 py-3 text-left" rowspan="2">Nama Materiil</th>
						<th class="w-36 border-r border-b px-2 py-3 text-center" rowspan="2">Merek / Type</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Satuan</th>
						<th class="w-36 border-r border-b px-3 py-3 text-center" rowspan="2">No Seri</th>
						<th class="w-36 border-r border-b px-2 py-1.5 text-center" colspan="3">Kondisi</th>
						<th class="border-b px-3 py-3 text-left" rowspan="2">Keterangan</th>
					{:else if reportType === 'TRIWULAN'}
						<th class="w-12 border-r border-b px-2 py-3 text-center" rowspan="2">No Urt</th>
						<th class="w-28 border-r border-b px-2 py-3 text-center" rowspan="2">Kode Barang</th>
						<th class="border-r border-b px-3 py-3 text-left" rowspan="2">Nama Materiil</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Sat</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">TOP</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">TW Lalu</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Tambah</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Kurang</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Sekarang</th>
						<th class="w-36 border-r border-b px-2 py-1.5 text-center" colspan="3">Kondisi</th>
						<th class="border-b px-3 py-3 text-left" rowspan="2">Keterangan</th>
					{:else if reportType === 'BULANAN'}
						<th class="w-12 border-r border-b px-2 py-3 text-center" rowspan="2">No Urt</th>
						<th class="w-28 border-r border-b px-2 py-3 text-center" rowspan="2">Kode Barang</th>
						<th class="border-r border-b px-3 py-3 text-left" rowspan="2">Nama Materiil</th>
						<th class="w-16 border-r border-b px-2 py-3 text-center" rowspan="2">Satuan</th>
						<th class="w-20 border-r border-b px-2 py-3 text-center" rowspan="2">Jumlah</th>
						<th class="w-36 border-r border-b px-2 py-1.5 text-center" colspan="3">Kondisi</th>
						<th class="border-b px-3 py-3 text-left" rowspan="2">Keterangan</th>
					{/if}
				</tr>
				<tr class="border-b border-border bg-muted/50 uppercase">
					<th class="w-12 border-r border-b px-1 py-1.5 text-center text-success">B</th>
					<th class="w-12 border-r border-b px-1 py-1.5 text-center text-primary">RR</th>
					<th class="w-12 border-r border-b px-1 py-1.5 text-center text-destructive">RB</th>
				</tr>
			</thead>
			<tbody>
				{#if btkQuery.loading}
					{#each Array(limit || 8) as _, i}
						<tr class="animate-pulse border-b border-border">
							<td class="border-r p-2 text-center"><Skeleton class="mx-auto h-3 w-4" /></td>
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-16" /></td>
							<td class="border-r p-2"><Skeleton class="h-3 w-40" /></td>
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
							{#if reportType === 'TRIWULAN'}
								<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
								<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
								<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
								<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
							{/if}
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-8" /></td>
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-4" /></td>
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-4" /></td>
							<td class="border-r p-2"><Skeleton class="mx-auto h-3 w-4" /></td>
							<td class="p-2"><Skeleton class="h-3 w-24" /></td>
						</tr>
					{/each}
				{:else if btkQuery.current && btkQuery.current.reports && btkQuery.current.reports.length > 0}
					{@const countObj = { globalIndex: 0 }}
					{#each btkQuery.current.reports as mainCat}
						<!-- Main Category Header Row -->
						<tr
							class="border-b border-border bg-muted/40 text-[11px] font-bold tracking-wide text-foreground"
						>
							<td
								colspan={reportType === 'NOMINATIF' ? 11 : reportType === 'TRIWULAN' ? 13 : 9}
								class="border-r bg-muted/20 px-3 py-2"
							>
								{mainCat.name}
							</td>
						</tr>

						{#each mainCat.subCategories as subCat}
							<!-- Sub Category Header Row -->
							<tr
								class="border-b border-border bg-muted/10 text-[10px] font-semibold text-muted-foreground italic"
							>
								<td
									colspan={reportType === 'NOMINATIF' ? 11 : reportType === 'TRIWULAN' ? 13 : 9}
									class="border-r px-4 py-1.5 pl-6"
								>
									↳ {subCat.name}
								</td>
							</tr>

							{#each subCat.items as item}
								{#if reportType === 'NOMINATIF'}
									{#each item.equipments || [] as eq}
										{@const currentIdx = ++countObj.globalIndex + (currentPage - 1) * limit}
										<tr
											class="border-b border-border text-[10px] uppercase transition-colors hover:bg-muted/30"
										>
											<td class="border-r p-1.5 text-center font-mono text-muted-foreground"
												>{currentIdx}</td
											>
											<td class="border-r p-1.5 text-center font-mono tracking-wider"
												>{item.itemId.slice(0, 8)}</td
											>
											<td class="border-r p-1.5 text-center font-mono">{eq.year || '-'}</td>
											<td class="border-r p-1.5 px-3 text-left font-bold text-foreground"
												>{item.itemName}</td
											>
											<td class="border-r p-1.5 text-center text-muted-foreground"
												>{eq.brand || '-'}</td
											>
											<td class="border-r p-1.5 text-center">{item.baseUnit}</td>
											<td class="border-r p-1.5 text-center font-mono tracking-wider"
												>{eq.serialNumber}</td
											>
											<!-- B, RR, RB -->
											<td class="border-r p-1.5 text-center font-bold text-success">
												{eq.condition === 'BAIK' ? '✓' : ''}
											</td>
											<td class="border-r p-1.5 text-center font-bold text-primary">
												{eq.condition === 'RUSAK_RINGAN' ? '✓' : ''}
											</td>
											<td class="border-r p-1.5 text-center font-bold text-destructive">
												{['RUSAK_BERAT', 'RUSAK_TOTAL'].includes(eq.condition) ? '✓' : ''}
											</td>
											<td class="p-1.5 px-3 text-[10px] text-muted-foreground normal-case italic">
												{eq.statusInfo}
											</td>
										</tr>
									{/each}
								{:else if reportType === 'TRIWULAN'}
									{@const currentIdx = ++countObj.globalIndex + (currentPage - 1) * limit}
									<tr
										class="border-b border-border text-[10px] uppercase transition-colors hover:bg-muted/30"
									>
										<td class="border-r p-1.5 text-center font-mono text-muted-foreground"
											>{currentIdx}</td
										>
										<td class="border-r p-1.5 text-center font-mono tracking-wider"
											>{item.itemId.slice(0, 8)}</td
										>
										<td class="border-r p-1.5 px-3 text-left font-bold text-foreground"
											>{item.itemName}</td
										>
										<td class="border-r p-1.5 text-center">{item.baseUnit}</td>
										<td class="border-r p-1.5 text-center font-mono font-medium"
											>{item.totalStock || 0}</td
										>
										<td class="border-r p-1.5 text-center font-mono">{item.twLalu || 0}</td>
										<td class="border-r p-1.5 text-center font-mono text-success"
											>+{item.tambah || 0}</td
										>
										<td class="border-r p-1.5 text-center font-mono text-destructive"
											>-{item.kurang || 0}</td
										>
										<td class="border-r p-1.5 text-center font-mono font-bold"
											>{item.sekarang || 0}</td
										>
										<!-- B, RR, RB -->
										<td class="border-r p-1.5 text-center font-bold text-success"
											>{item.baik || 0}</td
										>
										<td class="border-r p-1.5 text-center font-bold text-primary"
											>{item.rusakRingan || 0}</td
										>
										<td class="border-r p-1.5 text-center font-bold text-destructive"
											>{(item.rusakBerat || 0) + (item.rusakTotal || 0)}</td
										>
										<td class="p-1.5 px-3 text-[10px] text-muted-foreground normal-case italic">
											{item.keterangan || '-'}
										</td>
									</tr>
								{:else if reportType === 'BULANAN'}
									{@const currentIdx = ++countObj.globalIndex + (currentPage - 1) * limit}
									<tr
										class="border-b border-border text-[10px] uppercase transition-colors hover:bg-muted/30"
									>
										<td class="border-r p-1.5 text-center font-mono text-muted-foreground"
											>{currentIdx}</td
										>
										<td class="border-r p-1.5 text-center font-mono tracking-wider"
											>{item.itemId.slice(0, 8)}</td
										>
										<td class="border-r p-1.5 px-3 text-left font-bold text-foreground"
											>{item.itemName}</td
										>
										<td class="border-r p-1.5 text-center">{item.baseUnit}</td>
										<td class="border-r p-1.5 text-center font-mono font-bold"
											>{item.totalStock || 0}</td
										>
										<!-- B, RR, RB -->
										<td class="border-r p-1.5 text-center font-bold text-success"
											>{item.baik || 0}</td
										>
										<td class="border-r p-1.5 text-center font-bold text-primary"
											>{item.rusakRingan || 0}</td
										>
										<td class="border-r p-1.5 text-center font-bold text-destructive"
											>{(item.rusakBerat || 0) + (item.rusakTotal || 0)}</td
										>
										<td class="p-1.5 px-3 text-[10px] text-muted-foreground normal-case italic">
											{item.keterangan || '-'}
										</td>
									</tr>
								{/if}
							{/each}
						{/each}
					{/each}
				{:else}
					<tr>
						<td
							colspan={reportType === 'NOMINATIF' ? 11 : reportType === 'TRIWULAN' ? 13 : 9}
							class="border-b p-12 text-center text-muted-foreground italic"
						>
							<div class="flex flex-col items-center justify-center gap-2">
								<Building2 class="h-8 w-8 text-muted-foreground/45" />
								<span>Belum ada data materiil yang sesuai dengan filter di atas.</span>
							</div>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination Footer -->
	{#if btkQuery.current && btkQuery.current.pagination && btkQuery.current.pagination.totalPages > 1}
		<div
			class="mt-4 flex flex-col-reverse items-center justify-between gap-4 border-t border-border py-4 md:flex-row md:gap-0"
		>
			<div class="text-xs text-muted-foreground">
				Menampilkan <span class="font-semibold text-foreground"
					>{(currentPage - 1) * limit + 1}</span
				>
				-
				<span class="font-semibold text-foreground"
					>{Math.min(currentPage * limit, btkQuery.current.pagination.totalItems)}</span
				>
				dari
				<span class="font-semibold text-foreground">{btkQuery.current.pagination.totalItems}</span> data
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => (currentPage = currentPage - 1)}
					disabled={currentPage <= 1}
					class="h-8 gap-1 px-2 text-xs"
				>
					Sebelumnya
				</Button>
				<div class="flex items-center gap-1">
					{#each Array(btkQuery.current.pagination.totalPages) as _, i}
						{@const p = i + 1}
						{#if p === 1 || p === btkQuery.current.pagination.totalPages || (p >= currentPage - 1 && p <= currentPage + 1)}
							<Button
								variant={currentPage === p ? 'default' : 'ghost'}
								size="sm"
								onclick={() => (currentPage = p)}
								class="h-8 w-8 p-0 text-xs"
							>
								{p}
							</Button>
						{:else if p === currentPage - 2 || p === currentPage + 2}
							<span class="px-1 text-muted-foreground">...</span>
						{/if}
					{/each}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => (currentPage = currentPage + 1)}
					disabled={currentPage >= btkQuery.current.pagination.totalPages}
					class="h-8 gap-1 px-2 text-xs"
				>
					Selanjutnya
				</Button>
			</div>
		</div>
	{/if}
</div>

<style>
	table {
		border-spacing: 0;
	}
	th {
		font-weight: bold;
	}
</style>
