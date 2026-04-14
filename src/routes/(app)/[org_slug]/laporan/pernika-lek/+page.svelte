<script lang="ts">
	let { data } = $props();

	function exportCSV() {
		if (!data.groupedReports.length) return;

		const headers = [
			'NO',
			'SATKER',
			'NAMA MATERIIL',
			'MEREK / TYPE',
			'SATUAN',
			'JUMLAH',
			'B',
			'RR',
			'RB',
			'KET'
		];

		// FIX: Definisikan tipe data eksplisit untuk menghindari error TS7034
		const csvRows: string[] = [];

		data.groupedReports.forEach((org) => {
			org.items.forEach((item) => {
				csvRows.push(
					[
						item.index,
						org.orgName,
						item.itemName,
						item.brand || '-',
						item.unit,
						item.total,
						item.baik || 0,
						item.rr || 0,
						item.rb || 0,
						item.ket || '-'
					]
						.map((val) => `"${val}"`)
						.join(',')
				);
			});
		});

		const content = [headers.join(','), ...csvRows].join('\n');
		const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `LAP_PERNIKA_LEK_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="min-h-screen space-y-6 bg-background p-8 text-foreground">
	<div class="space-y-1 text-center">
		<h1 class="text-xl font-bold uppercase underline">LAPORAN MATERIIL PERNIKA DAN LEK</h1>
		<p class="text-sm font-semibold italic text-muted-foreground">Daftar Materiil Berdasarkan Satuan Jajaran</p>
	</div>

	<div class="flex justify-end print:hidden">
		<button
			onclick={exportCSV}
			class="rounded-md bg-secondary px-6 py-2 text-xs font-bold tracking-wider text-secondary-foreground uppercase shadow transition hover:bg-secondary/90"
		>
			Ekspor (.CSV)
		</button>
	</div>

	<div class="overflow-x-auto border-[1.5px] border-border">
		<table class="w-full border-collapse text-[11.5px]">
			<thead>
				<tr class="bg-muted font-bold uppercase">
					<th class="w-10 border border-border px-1 py-3" rowspan="2">No</th>
					<th class="border border-border px-4 py-3" rowspan="2">Satker</th>
					<th class="border border-border px-4 py-3 text-left" rowspan="2"
						>Nama Materiil / Jenis Alkom</th
					>
					<th class="border border-border px-4 py-3" rowspan="2">Merek / Type</th>
					<th class="border border-border px-2 py-3" rowspan="2">Satuan</th>
					<th class="border border-border px-2 py-3" rowspan="2">Jumlah</th>
					<th class="border border-border py-1" colspan="3">Kondisi</th>
					<th class="border border-border px-4 py-3" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-muted font-bold uppercase">
					<th class="w-12 border border-border px-2 py-1">B</th>
					<th class="w-12 border border-border px-2 py-1">RR</th>
					<th class="w-12 border border-border px-2 py-1">RB</th>
				</tr>
			</thead>
			<tbody>
				{#each data.groupedReports as org}
					{#each org.items as row, i}
						<tr class="border-b border-border uppercase hover:bg-muted/30">
							<td class="border border-border p-2 text-center font-mono">
								{row.index}
							</td>

							{#if i === 0}
								<td
									class="border border-border bg-muted/50 p-2 px-4 text-center font-bold"
									rowspan={org.items.length}
								>
									{org.orgName}
								</td>
							{/if}

							<td class="border border-border p-2 px-4 text-left font-semibold">{row.itemName}</td>
							<td class="border border-border p-2 px-4 text-center">{row.brand || '-'}</td>
							<td class="border border-border p-2 text-center">{row.unit}</td>

							<td class="border border-border bg-muted/20 p-2 text-center font-bold"
								>{row.total}</td
							>

							<td class="border border-border p-2 text-center font-bold text-success"
								>{row.baik || 0}</td
							>
							<td class="border border-border p-2 text-center font-bold text-primary"
								>{row.rr || 0}</td
							>
							<td class="border border-border p-2 text-center font-bold text-destructive"
								>{row.rb || 0}</td
							>

							<td class="border border-border p-2 px-4 text-left text-muted-foreground normal-case italic">
								{row.ket || '-'}
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td
							colspan="10"
							class="p-16 text-center text-muted-foreground border border-border italic bg-muted/20"
						>
							Data tidak tersedia.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	table {
		border-spacing: 0;
	}
	@media print {
		.p-8 {
			padding: 0;
		}
		button {
			display: none !important;
		}
		th,
		td {
			border: 1px solid black !important;
		}
	}
</style>
