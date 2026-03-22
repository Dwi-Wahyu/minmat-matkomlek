<script lang="ts">
	import {
		Package,
		Warehouse,
		AlertTriangle,
		ArrowLeftRight,
		Truck,
		Home,
		ClipboardList,
		FileText,
		BarChart2,
		Activity,
		Box,
		ArrowDownToLine,
		ArrowUpFromLine,
		ChevronRight
	} from '@lucide/svelte';

	let { data } = $props();

	// Menggunakan derived untuk reaktivitas jika data berubah
	const summary = $derived(data.summary);
	const transito = $derived(data.transito);
	const komoditi = $derived(data.komoditi);
	const balkir = $derived(data.balkir);
	const recentEquipments = $derived(data.recentEquipments);

	// Data untuk chart pergerakan
	const chartData = $derived([
		{ label: 'Transito', value: transito.incoming, color: 'bg-blue-500' },
		{ label: 'Komoditi', value: komoditi.outgoing, color: 'bg-orange-500' },
		{ label: 'Balkir', value: transito.outgoing, color: 'bg-emerald-500' }
	]);

	const maxChartValue = $derived(Math.max(...chartData.map((d) => d.value), 10));
</script>

<div class="p-8 space-y-8">
	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
			<div class="p-3 bg-blue-50 text-blue-600 rounded-xl">
				<Box size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventaris Aktif</p>
				<p class="text-2xl font-bold text-slate-900">{summary.activeInventory.toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
			<div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
				<Package size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Persediaan Gudang</p>
				<p class="text-2xl font-bold text-slate-900">{summary.warehouseStock.toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
			<div class="p-3 bg-red-50 text-red-600 rounded-xl">
				<AlertTriangle size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Barang Rusak</p>
				<p class="text-2xl font-bold text-slate-900">{summary.damagedItems.toLocaleString()}</p>
			</div>
		</div>

		<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
			<div class="p-3 bg-orange-50 text-orange-600 rounded-xl">
				<ArrowLeftRight size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mutasi Bulan Ini</p>
				<p class="text-2xl font-bold text-slate-900">{summary.monthlyMovements.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Logistic Groups -->
		<div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Transito -->
			<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
					<Truck size={18} class="text-blue-500" />
					<h3 class="font-bold text-slate-800 text-sm uppercase tracking-wide">Gudang Transito</h3>
				</div>
				<div class="p-5 flex-1 space-y-4">
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Barang Masuk</span>
						<span class="font-bold text-slate-900">{transito.incoming}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Barang Keluar</span>
						<span class="font-bold text-slate-900">{transito.outgoing}</span>
					</div>
					<div class="pt-2 border-t border-slate-50 flex justify-between items-center text-sm font-semibold text-blue-600">
						<span>Pending Distribusi</span>
						<span>{transito.pending} Item</span>
					</div>
				</div>
			</div>

			<!-- Komoditi -->
			<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
					<Home size={18} class="text-emerald-500" />
					<h3 class="font-bold text-slate-800 text-sm uppercase tracking-wide">Gudang Komoditi</h3>
				</div>
				<div class="p-5 flex-1 space-y-4">
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Stok Aktif</span>
						<span class="font-bold text-slate-900">{komoditi.active.toLocaleString()}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Barang Keluar</span>
						<span class="font-bold text-slate-900">{komoditi.outgoing}</span>
					</div>
					<div class="pt-2 border-t border-slate-50 flex justify-between items-center text-sm font-semibold text-emerald-600">
						<span>Barang Rusak</span>
						<span>{komoditi.damaged}</span>
					</div>
				</div>
			</div>

			<!-- Balkir -->
			<div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
				<div class="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
					<Warehouse size={18} class="text-orange-500" />
					<h3 class="font-bold text-slate-800 text-sm uppercase tracking-wide">Gudang Balkir</h3>
				</div>
				<div class="p-5 flex-1 space-y-4">
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Inventaris</span>
						<span class="font-bold text-slate-900">{balkir.total.toLocaleString()}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Digunakan</span>
						<span class="font-bold text-slate-900 text-emerald-600">{balkir.used.toLocaleString()}</span>
					</div>
					<div class="flex justify-between items-center text-sm">
						<span class="text-slate-500">Cadangan</span>
						<span class="font-bold text-slate-900 text-blue-600">{balkir.ready.toLocaleString()}</span>
					</div>
				</div>
			</div>

			<!-- Chart Section -->
			<div class="md:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
				<div class="flex justify-between items-center mb-8">
					<h3 class="font-bold text-slate-800 flex items-center gap-2">
						<BarChart2 size={18} class="text-slate-400" />
						Pergerakan Barang
					</h3>
					<div class="text-xs text-slate-400 font-medium">Periode {new Date().getFullYear()}</div>
				</div>
				
				<div class="flex h-48 items-end gap-8 px-4 border-b border-slate-100 pb-2">
					{#each chartData as bar (bar.label)}
						<div class="group relative flex flex-1 flex-col items-center">
							<div class="absolute -top-8 text-xs font-bold text-slate-900 opacity-0 transition-opacity group-hover:opacity-100 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
								{bar.value}
							</div>
							<div 
								class="{bar.color} w-full rounded-t-lg transition-all hover:brightness-110 shadow-sm" 
								style="height: {(bar.value / (maxChartValue || 1)) * 100}%"
							></div>
							<span class="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{bar.label}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column: Status & Recent Activity -->
		<div class="space-y-8">
			<!-- Operational Status -->
			<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
				<div class="flex items-center justify-between mb-6">
					<h3 class="font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide text-sm">
						<Activity size={18} class="text-emerald-500" />
						Status Kesiapan
					</h3>
				</div>
				<div class="space-y-6">
					<div>
						<div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2">
							<span>Kesiapan Material</span>
							<span>{Math.round((balkir.ready / (balkir.total || 1)) * 100)}%</span>
						</div>
						<div class="h-2 bg-slate-100 rounded-full overflow-hidden">
							<div class="h-full bg-emerald-500 rounded-full" style="width: {Math.round((balkir.ready / (balkir.total || 1)) * 100)}%"></div>
						</div>
					</div>
					<div>
						<div class="flex justify-between text-xs font-bold uppercase text-slate-500 mb-2">
							<span>Tingkat Kerusakan</span>
							<span>{Math.round((summary.damagedItems / (summary.activeInventory || 1)) * 100)}%</span>
						</div>
						<div class="h-2 bg-slate-100 rounded-full overflow-hidden">
							<div class="h-full bg-red-500 rounded-full" style="width: {Math.round((summary.damagedItems / (summary.activeInventory || 1)) * 100)}%"></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
				<h3 class="font-bold text-slate-800 text-sm uppercase tracking-wide mb-6">Peralatan Terbaru</h3>
				<div class="space-y-4">
					{#each recentEquipments as eq (eq.id)}
						<div class="flex items-center gap-4 group cursor-default">
							<div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
								<Box size={18} />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-bold text-slate-900 truncate">{eq.name}</p>
								<p class="text-[10px] text-slate-400 font-mono">{eq.serialNumber || 'No SN'}</p>
							</div>
							<div class="text-[10px] px-2 py-1 rounded font-bold uppercase {eq.condition === 'BAIK' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
								{eq.condition}
							</div>
						</div>
					{/each}
				</div>
				<button class="w-full mt-6 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 group">
					Lihat Semua Inventaris
					<ChevronRight size={14} class="transition-transform group-hover:translate-x-1" />
				</button>
			</div>
		</div>
	</div>

	<!-- Bottom Quick Actions -->
	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
		<a href="dashboard" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<ClipboardList size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Inventaris</span>
		</a>
		<a href="gudang" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<ArrowLeftRight size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Mutasi</span>
		</a>
		<a href="barang" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<ArrowDownToLine size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Penerimaan</span>
		</a>
		<a href="barang" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<ArrowUpFromLine size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Pengeluaran</span>
		</a>
		<a href="laporan" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<FileText size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Laporan</span>
		</a>
		<a href="monitoring" class="flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30 group">
			<BarChart2 size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span class="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Monitoring</span>
		</a>
	</div>
</div>
