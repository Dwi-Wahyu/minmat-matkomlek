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

<div class="min-h-screen space-y-6 bg-white p-8">
	<div class="space-y-1 text-center">
		<h1 class="text-xl font-bold uppercase underline">LAPORAN MATERIIL PERNIKA DAN LEK</h1>
		<p class="text-sm font-semibold italic">Daftar Materiil Berdasarkan Satuan Jajaran</p>
	</div>

	<div class="flex justify-end print:hidden">
		<button
			onclick={exportCSV}
			class="rounded-md bg-zinc-900 px-6 py-2 text-xs font-bold tracking-wider text-white uppercase shadow transition hover:bg-black"
		>
			Ekspor (.CSV)
		</button>
	</div>

	<div class="overflow-x-auto border-[1.5px] border-black">
		<table class="w-full border-collapse text-[11.5px]">
			<thead>
				<tr class="bg-zinc-100 font-bold uppercase">
					<th class="w-10 border border-black px-1 py-3" rowspan="2">No</th>
					<th class="border border-black px-4 py-3" rowspan="2">Satker</th>
					<th class="border border-black px-4 py-3 text-left" rowspan="2"
						>Nama Materiil / Jenis Alkom</th
					>
					<th class="border border-black px-4 py-3" rowspan="2">Merek / Type</th>
					<th class="border border-black px-2 py-3" rowspan="2">Satuan</th>
					<th class="border border-black px-2 py-3" rowspan="2">Jumlah</th>
					<th class="border border-black py-1" colspan="3">Kondisi</th>
					<th class="border border-black px-4 py-3" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-zinc-100 font-bold uppercase">
					<th class="w-12 border border-black px-2 py-1">B</th>
					<th class="w-12 border border-black px-2 py-1">RR</th>
					<th class="w-12 border border-black px-2 py-1">RB</th>
				</tr>
			</thead>
			<tbody>
				{#each data.groupedReports as org}
					{#each org.items as row, i}
						<tr class="border-b border-black uppercase hover:bg-zinc-50/50">
							<td class="border border-black p-2 text-center font-mono">
								{row.index}
							</td>

							{#if i === 0}
								<td
									class="border border-black bg-zinc-50 p-2 px-4 text-center font-bold"
									rowspan={org.items.length}
								>
									{org.orgName}
								</td>
							{/if}

							<td class="border border-black p-2 px-4 text-left font-semibold">{row.itemName}</td>
							<td class="border border-black p-2 px-4 text-center">{row.brand || '-'}</td>
							<td class="border border-black p-2 text-center">{row.unit}</td>

							<td class="border border-black bg-zinc-100/50 p-2 text-center font-bold"
								>{row.total}</td
							>

							<td class="border border-black p-2 text-center font-bold text-green-700"
								>{row.baik || 0}</td
							>
							<td class="border border-black p-2 text-center font-bold text-amber-600"
								>{row.rr || 0}</td
							>
							<td class="border border-black p-2 text-center font-bold text-red-600"
								>{row.rb || 0}</td
							>

							<td class="border border-black p-2 px-4 text-left text-zinc-500 normal-case italic">
								{row.ket || '-'}
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td
							colspan="10"
							class="p-16 text-center text-zinc-400 border border-black italic bg-zinc-50"
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
