<script lang="ts">
	let { data } = $props();

	function exportCSV() {
		if (!data.reports.length) return;

		const headers = [
			'NO URT',
			'NO SAT',
			'NO KAT / KODE',
			'NAMA MATERIAL',
			'MEREK / TYPE',
			'SATUAN',
			'NO SERI/MESIN',
			'B',
			'RR',
			'RB',
			'KET'
		];
		const rows = data.reports.map((r, i) => [
			i + 1,
			i + 1,
			r.itemId, // Menggunakan ID sebagai Kode
			r.itemName,
			r.brand || '-',
			r.unit,
			r.serialNumber || '-',
			r.condition === 'BAIK' ? '1' : '0',
			r.condition === 'RUSAK_RINGAN' ? '1' : '0',
			r.condition === 'RUSAK_BERAT' ? '1' : '0',
			r.itemDescription || '-'
		]);

		const content = [headers, ...rows].map((row) => row.join(',')).join('\n');
		const blob = new Blob([content], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `BTK16_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
	}
</script>

<div class="space-y-4 p-6">
	<div class="flex items-end justify-between">
		<div class="w-full text-center">
			<h1 class="text-lg font-bold uppercase underline">LAPORAN KONDISI MATERIIL</h1>
			<h2 class="text-md font-bold uppercase">( BTK - 16 )</h2>
		</div>
		<button
			onclick={exportCSV}
			class="w-fit rounded bg-green-800 px-4 py-2 text-sm text-white shadow-sm hover:bg-green-900"
		>
			Ekspor CSV
		</button>
	</div>

	<div class="overflow-x-auto">
		<table class="w-full border-collapse border border-black text-[11px]">
			<thead>
				<tr class="bg-gray-100 uppercase">
					<th class="w-8 border border-black px-1 py-2" rowspan="2">No Urt</th>
					<th class="border border-black px-2 py-2" rowspan="2">No Kat / Kode Barang</th>
					<th class="border border-black px-2 py-2" rowspan="2">Nama Material</th>
					<th class="border border-black px-2 py-2" rowspan="2">Merek / Type</th>
					<th class="border border-black px-2 py-2" rowspan="2">Satuan</th>
					<th class="border border-black px-2 py-2" rowspan="2">No. Senjata / Rangka / Mesin</th>
					<th class="border border-black px-2 py-1" colspan="3">Kondisi</th>
					<th class="border border-black px-2 py-2" rowspan="2">Ket</th>
				</tr>
				<tr class="bg-gray-100">
					<th class="w-8 border border-black px-1 py-1 text-center">B</th>
					<th class="w-8 border border-black px-1 py-1 text-center">RR</th>
					<th class="w-8 border border-black px-1 py-1 text-center">RB</th>
				</tr>
			</thead>
			<tbody>
				{#each data.reports as row, i}
					<tr class="uppercase hover:bg-gray-50">
						<td class="border border-black p-1 text-center">{i + 1}</td>
						<td class="border border-black p-1 px-2 font-mono">{row.itemId.slice(0, 8)}</td>
						<td class="border border-black p-1 px-2 font-semibold">{row.itemName}</td>
						<td class="border border-black p-1 px-2">{row.brand || '-'}</td>
						<td class="border border-black p-1 text-center">{row.unit}</td>
						<td class="border border-black p-1 px-2 text-center">{row.serialNumber || '-'}</td>

						<td class="border border-black p-1 text-center font-bold">
							{row.condition === 'BAIK' ? '✓' : ''}
						</td>
						<td class="border border-black p-1 text-center font-bold">
							{row.condition === 'RUSAK_RINGAN' ? '✓' : ''}
						</td>
						<td class="border border-black p-1 text-center font-bold">
							{row.condition === 'RUSAK_BERAT' ? '✓' : ''}
						</td>

						<td class="border border-black p-1 px-2 text-[10px] lowercase italic">
							{row.itemDescription || '-'}
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="11" class="border border-black p-4 text-center text-gray-500">
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
	th {
		font-weight: bold;
	}
	@media print {
		button {
			display: none;
		}
	}
</style>
