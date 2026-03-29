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

<div class="space-y-8 p-8">
	<!-- Summary Cards -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<div
			class="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
		>
			<div class="rounded-xl bg-blue-50 p-3 text-blue-600">
				<Box size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
					Inventaris Aktif
				</p>
				<p class="text-2xl font-bold text-slate-900">{summary.activeInventory.toLocaleString()}</p>
			</div>
		</div>

		<div
			class="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
		>
			<div class="rounded-xl bg-emerald-50 p-3 text-emerald-600">
				<Package size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
					Persediaan Gudang
				</p>
				<p class="text-2xl font-bold text-slate-900">{summary.warehouseStock.toLocaleString()}</p>
			</div>
		</div>

		<div
			class="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
		>
			<div class="rounded-xl bg-red-50 p-3 text-red-600">
				<AlertTriangle size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-wider text-slate-500 uppercase">Barang Rusak</p>
				<p class="text-2xl font-bold text-slate-900">{summary.damagedItems.toLocaleString()}</p>
			</div>
		</div>

		<div
			class="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md"
		>
			<div class="rounded-xl bg-orange-50 p-3 text-orange-600">
				<ArrowLeftRight size={24} />
			</div>
			<div>
				<p class="text-xs font-semibold tracking-wider text-slate-500 uppercase">
					Mutasi Bulan Ini
				</p>
				<p class="text-2xl font-bold text-slate-900">{summary.monthlyMovements.toLocaleString()}</p>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Logistic Groups -->
		<div class="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-2">
			<!-- Transito -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
			>
				<div class="flex items-center gap-2 border-b border-slate-50 bg-slate-50/50 px-5 py-4">
					<Truck size={18} class="text-blue-500" />
					<h3 class="text-sm font-bold tracking-wide text-slate-800 uppercase">Gudang Transito</h3>
				</div>
				<div class="flex-1 space-y-4 p-5">
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Barang Masuk</span>
						<span class="font-bold text-slate-900">{transito.incoming}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Barang Keluar</span>
						<span class="font-bold text-slate-900">{transito.outgoing}</span>
					</div>
					<div
						class="flex items-center justify-between border-t border-slate-50 pt-2 text-sm font-semibold text-blue-600"
					>
						<span>Pending Distribusi</span>
						<span>{transito.pending} Item</span>
					</div>
				</div>
			</div>

			<!-- Komoditi -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
			>
				<div class="flex items-center gap-2 border-b border-slate-50 bg-slate-50/50 px-5 py-4">
					<Home size={18} class="text-emerald-500" />
					<h3 class="text-sm font-bold tracking-wide text-slate-800 uppercase">Gudang Komoditi</h3>
				</div>
				<div class="flex-1 space-y-4 p-5">
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Stok Aktif</span>
						<span class="font-bold text-slate-900">{komoditi.active.toLocaleString()}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Barang Keluar</span>
						<span class="font-bold text-slate-900">{komoditi.outgoing}</span>
					</div>
					<div
						class="flex items-center justify-between border-t border-slate-50 pt-2 text-sm font-semibold text-emerald-600"
					>
						<span>Barang Rusak</span>
						<span>{komoditi.damaged}</span>
					</div>
				</div>
			</div>

			<!-- Balkir -->
			<div
				class="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
			>
				<div class="flex items-center gap-2 border-b border-slate-50 bg-slate-50/50 px-5 py-4">
					<Warehouse size={18} class="text-orange-500" />
					<h3 class="text-sm font-bold tracking-wide text-slate-800 uppercase">Gudang Balkir</h3>
				</div>
				<div class="flex-1 space-y-4 p-5">
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Inventaris</span>
						<span class="font-bold text-slate-900">{balkir.total.toLocaleString()}</span>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Digunakan</span>
						<span class="font-bold text-emerald-600 text-slate-900"
							>{balkir.used.toLocaleString()}</span
						>
					</div>
					<div class="flex items-center justify-between text-sm">
						<span class="text-slate-500">Cadangan</span>
						<span class="font-bold text-blue-600 text-slate-900"
							>{balkir.ready.toLocaleString()}</span
						>
					</div>
				</div>
			</div>

			<!-- Chart Section -->
			<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:col-span-3">
				<div class="mb-8 flex items-center justify-between">
					<h3 class="flex items-center gap-2 font-bold text-slate-800">
						<BarChart2 size={18} class="text-slate-400" />
						Pergerakan Barang
					</h3>
					<div class="text-xs font-medium text-slate-400">Periode {new Date().getFullYear()}</div>
				</div>

				<div class="flex h-48 items-end gap-8 border-b border-slate-100 px-4 pb-2">
					{#each chartData as bar (bar.label)}
						<div class="group relative flex h-full flex-1 flex-col items-center justify-end">
							<div
								class="absolute -top-8 z-10 rounded border border-slate-100 bg-white px-2 py-1 text-xs font-bold whitespace-nowrap text-slate-900 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
							>
								{bar.value}
							</div>

							<div
								class="{bar.color} w-full rounded-t-lg shadow-sm transition-all hover:brightness-110"
								style="height: {(bar.value / (maxChartValue || 1)) * 100}%"
							></div>

							<span
								class="absolute -bottom-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase"
							>
								{bar.label}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- Right Column: Status & Recent Activity -->
		<div class="space-y-8">
			<!-- Operational Status -->
			<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
				<div class="mb-6 flex items-center justify-between">
					<h3
						class="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-800 uppercase"
					>
						<Activity size={18} class="text-emerald-500" />
						Status Kesiapan
					</h3>
				</div>
				<div class="space-y-6">
					<div>
						<div class="mb-2 flex justify-between text-xs font-bold text-slate-500 uppercase">
							<span>Kesiapan Material</span>
							<span>{Math.round((balkir.ready / (balkir.total || 1)) * 100)}%</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-100">
							<div
								class="h-full rounded-full bg-emerald-500"
								style="width: {Math.round((balkir.ready / (balkir.total || 1)) * 100)}%"
							></div>
						</div>
					</div>
					<div>
						<div class="mb-2 flex justify-between text-xs font-bold text-slate-500 uppercase">
							<span>Tingkat Kerusakan</span>
							<span
								>{Math.round((summary.damagedItems / (summary.activeInventory || 1)) * 100)}%</span
							>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-slate-100">
							<div
								class="h-full rounded-full bg-red-500"
								style="width: {Math.round(
									(summary.damagedItems / (summary.activeInventory || 1)) * 100
								)}%"
							></div>
						</div>
					</div>
				</div>
			</div>

			<!-- Recent Activity -->
			<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
				<h3 class="mb-6 text-sm font-bold tracking-wide text-slate-800 uppercase">
					Peralatan Terbaru
				</h3>
				<div class="space-y-4">
					{#each recentEquipments as eq (eq.id)}
						<div class="group flex cursor-default items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500"
							>
								<Box size={18} />
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-bold text-slate-900">{eq.name}</p>
								<p class="font-mono text-[10px] text-slate-400">{eq.serialNumber || 'No SN'}</p>
							</div>
							<div
								class="rounded px-2 py-1 text-[10px] font-bold uppercase {eq.condition === 'BAIK'
									? 'bg-emerald-50 text-emerald-600'
									: 'bg-red-50 text-red-600'}"
							>
								{eq.condition}
							</div>
						</div>
					{/each}
				</div>
				<button
					class="group mt-6 flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-blue-600 hover:text-blue-700"
				>
					Lihat Semua Inventaris
					<ChevronRight size={14} class="transition-transform group-hover:translate-x-1" />
				</button>
			</div>
		</div>
	</div>

	<!-- Bottom Quick Actions -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
		<a
			href="/{data.org_slug}/alat/alkomlek"
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
		>
			<ClipboardList size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span
				class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
				>Inventaris</span
			>
		</a>
		<a
			href="/{data.org_slug}/gudang/transito"
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
		>
			<ArrowLeftRight size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span
				class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
				>Mutasi</span
			>
		</a>
		<a
			href="/{data.org_slug}/gudang/transito?movementEvent=['TRANSFER_IN', 'LOAN_IN', 'DISTRIBUTE_IN', 'MAINTENANCE_IN']"
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
		>
			<ArrowDownToLine size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span
				class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
				>Penerimaan</span
			>
		</a>
		<a
			href="/{data.org_slug}/gudang/transito?movementEvent=['TRANSFER_OUT', 'LOAN_OUT', 'DISTRIBUTE_OUT', 'MAINTENANCE_OUT']"
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
		>
			<ArrowUpFromLine size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span
				class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
				>Pengeluaran</span
			>
		</a>
		<a
			href="/{data.org_slug}/laporan/btk16"
			class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
		>
			<FileText size={22} class="text-slate-400 group-hover:text-blue-500" />
			<span
				class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
				>Laporan</span
			>
		</a>
		{#if data.user.role === 'superadmin'}
			<a
				href="/{data.org_slug}/pengaturan/audit-log"
				class="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50/30"
			>
				<BarChart2 size={22} class="text-slate-400 group-hover:text-blue-500" />
				<span
					class="text-[10px] font-bold tracking-widest text-slate-500 uppercase group-hover:text-slate-900"
					>Monitoring</span
				>
			</a>
		{/if}
	</div>
</div>
