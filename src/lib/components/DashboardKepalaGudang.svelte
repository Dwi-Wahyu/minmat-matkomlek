<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		Package,
		AlertTriangle,
		ArrowLeftRight,
		Wrench,
		Truck,
		ClipboardList,
		PackageCheck,
		ChevronRight,
		Warehouse as WarehouseIcon,
		CheckCircle2,
		Clock,
		SquareArrowOutUpRight
	} from '@lucide/svelte';

	// Tipe data dashboard kepala gudang — sesuai return value dari load function di server
	type DashboardData = {
		org_slug: string;
		// 'ALL' = Kepala Gudang satuan jajaran (gudang tunggal, tanpa warehouseHeadType spesifik)
		// yang mengelola ketiga klasifikasi sekaligus, berbeda dari Kepala Gudang Pusat yang
		// masing-masing dibagi per klasifikasi (TRANSITO/BALKIR/KOMUNITY)
		warehouseHeadType: 'TRANSITO' | 'BALKIR' | 'KOMUNITY' | 'ALL';
		summary: {
			totalAlat: number;
			siapPakai: number;
			rusak: number;
			mutasiBulanIni: number;
		};
		// Khusus Transito
		transito?: {
			total: number;
		};
		// Khusus Balkir
		balkir?: {
			total: number;
		};
		// Khusus Komunity
		komunity?: {
			total: number;
		};
		pemeliharaanPending: {
			id: string;
			equipmentName: string;
			serialNumber: string | null;
			maintenanceType: string;
			status: string;
			scheduledDate: string;
		}[];
		alatPerluPerhatian: {
			id: string;
			name: string;
			brand: string | null;
			serialNumber: string | null;
			condition: string;
			status: string;
		}[];
	};

	let {
		data,
		org_slug,
		returnReminders = []
	}: {
		data: DashboardData;
		org_slug: string;
		returnReminders?: {
			lendingId: string;
			unit: string;
			equipmentName: string;
			serialNumber: string;
			endDate: Date;
			isOverdue: boolean;
		}[];
	} = $props();

	const summary = $derived(
		data.summary ?? { totalAlat: 0, siapPakai: 0, rusak: 0, mutasiBulanIni: 0 }
	);
	const pemeliharaanPending = $derived(data.pemeliharaanPending ?? []);
	const alatPerluPerhatian = $derived(data.alatPerluPerhatian ?? []);

	const headTypeLabel: Record<string, string> = {
		TRANSITO: 'Gudang Transito',
		BALKIR: 'Gudang Balkir',
		KOMUNITY: 'Gudang Komunity',
		ALL: 'Gudang Satuan'
	};

	const headTypeDesc: Record<string, string> = {
		TRANSITO: 'Pengawasan alat dalam proses perpindahan/transfer antar gudang',
		BALKIR: 'Pengawasan persediaan utama dan kesiapan materiil',
		KOMUNITY: 'Pengawasan alat yang sedang digunakan satuan jajaran',
		ALL: 'Pengawasan seluruh klasifikasi mutasi'
	};

	const headTypeColor: Record<string, string> = {
		TRANSITO: 'bg-primary',
		BALKIR: 'bg-primary',
		KOMUNITY: 'bg-primary',
		ALL: 'bg-primary'
	};

	// stokRoute dipakai untuk mode spesifik (TRANSITO/BALKIR/KOMUNITY) saja —
	// mode 'ALL' punya cabang render terpisah yang menampilkan ketiga link sekaligus
	const stokRoute: Record<string, string> = {
		TRANSITO: '/(app)/[org_slug]/stok/transito',
		BALKIR: '/(app)/[org_slug]/stok/balkir',
		KOMUNITY: '/(app)/[org_slug]/stok/komunity'
	};
</script>

<!-- Header Identitas Gudang -->
<div class="flex items-center gap-4">
	<div class="rounded-2xl {headTypeColor[data.warehouseHeadType]} p-3 text-white shadow-sm">
		<WarehouseIcon size={26} />
	</div>
	<div>
		<h1 class="text-xl font-bold text-foreground">
			{headTypeLabel[data.warehouseHeadType]}
		</h1>
		<p class="text-sm text-muted-foreground">{headTypeDesc[data.warehouseHeadType]}</p>
	</div>
</div>

<!-- Summary Cards -->
<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-primary/10 p-3 text-primary"><Package size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Total Alat</p>
			<p class="text-2xl font-bold text-foreground">{summary.totalAlat.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-success/10 p-3 text-success"><CheckCircle2 size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Siap Pakai</p>
			<p class="text-2xl font-bold text-foreground">{summary.siapPakai.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-destructive/10 p-3 text-destructive">
			<AlertTriangle size={24} />
		</div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Kondisi Rusak
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.rusak.toLocaleString()}</p>
		</div>
	</div>

	<div
		class="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md"
	>
		<div class="rounded-xl bg-primary/10 p-3 text-primary"><ArrowLeftRight size={24} /></div>
		<div>
			<p class="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
				Mutasi Bulan Ini
			</p>
			<p class="text-2xl font-bold text-foreground">{summary.mutasiBulanIni.toLocaleString()}</p>
		</div>
	</div>
</div>

<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
	<div class="space-y-8 lg:col-span-2">
		<!-- Panel khusus sesuai jenis gudang — dibuat sebagai blok independen (bukan else-if) agar
		     mode 'ALL' (kepala gudang satuan jajaran) dapat menampilkan ketiga panel sekaligus,
		     sementara mode spesifik (TRANSITO/BALKIR/KOMUNITY) hanya menampilkan satu karena
		     data panel lain memang tidak dikirim dari server (undefined) -->
		{#if data.warehouseHeadType === 'ALL' || data.warehouseHeadType === 'KOMUNITY'}
			<!-- Alat Perlu Dikembalikan -->
			<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
				<div class="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-4">
					<Clock size={16} class="text-amber-500" />
					<h3 class="text-sm font-bold tracking-wide text-foreground uppercase">
						Alat Perlu Dikembalikan
					</h3>
					<span class="ml-auto text-xs font-medium text-muted-foreground">
						{returnReminders.length} item
					</span>
				</div>
				<div class="divide-y divide-border">
					{#each returnReminders as r, idx (r.lendingId + '-' + r.serialNumber + '-' + idx)}
						<a
							href={resolve('/(app)/[org_slug]/peminjaman/[id]', {
								org_slug,
								id: r.lendingId
							})}
							class="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40"
						>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-bold text-foreground">{r.equipmentName}</p>
								<p class="text-xs font-medium text-muted-foreground">{r.unit}</p>
								<p class="mt-0.5 text-[10px] text-muted-foreground">
									S/N: {r.serialNumber} · Batas waktu: {new Date(r.endDate).toLocaleDateString(
										'id-ID',
										{
											day: 'numeric',
											month: 'short',
											year: 'numeric'
										}
									)}
								</p>
							</div>
							<span
								class="rounded px-2 py-1 text-[10px] font-bold {r.isOverdue
									? 'bg-destructive/10 text-destructive'
									: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}"
							>
								{r.isOverdue ? 'Terlambat' : 'Harus Kembali'}
							</span>
						</a>
					{:else}
						<p class="px-5 py-8 text-center text-sm text-muted-foreground">
							Tidak ada alat yang perlu dikembalikan saat ini
						</p>
					{/each}
				</div>
			</div>
		{/if}

		{#if data.transito && data.warehouseHeadType !== 'ALL'}
			<div class="rounded-2xl border border-border bg-card shadow-sm">
				<a
					href={resolve('/(app)/[org_slug]/stok/transito', { org_slug })}
					class="group flex items-center justify-between border-b border-border bg-muted/50 px-5 py-4 transition-colors hover:bg-muted"
				>
					<h3
						class="text-sm font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary"
					>
						Status Transito
					</h3>
					<SquareArrowOutUpRight
						class="h-4 w-4 text-foreground transition-colors group-hover:text-primary"
					/>
				</a>
				<div class="p-6 text-center">
					<p class="text-4xl font-extrabold text-primary">{data.transito.total}</p>
					<p class="mt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Total Item Transito
					</p>
				</div>
			</div>
		{/if}

		{#if data.balkir && data.warehouseHeadType !== 'ALL'}
			<div class="rounded-2xl border border-border bg-card shadow-sm">
				<a
					href={resolve('/(app)/[org_slug]/stok/balkir', { org_slug })}
					class="group flex items-center justify-between border-b border-border bg-muted/50 px-5 py-4 transition-colors hover:bg-muted"
				>
					<h3
						class="text-sm font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary"
					>
						Materiil Balkir
					</h3>
					<SquareArrowOutUpRight
						class="h-4 w-4 text-foreground transition-colors group-hover:text-primary"
					/>
				</a>
				<div class="p-6 text-center">
					<p class="text-4xl font-extrabold text-amber-600 dark:text-amber-400">
						{data.balkir.total}
					</p>
					<p class="mt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Total Item Balkir
					</p>
				</div>
			</div>
		{/if}

		{#if data.komunity && data.warehouseHeadType !== 'ALL'}
			<div class="rounded-2xl border border-border bg-card shadow-sm">
				<a
					href={resolve('/(app)/[org_slug]/stok/komunity', { org_slug })}
					class="group flex items-center justify-between border-b border-border bg-muted/50 px-5 py-4 transition-colors hover:bg-muted"
				>
					<h3
						class="text-sm font-bold tracking-wide text-foreground uppercase transition-colors group-hover:text-primary"
					>
						Status Komunity
					</h3>
					<SquareArrowOutUpRight
						class="h-4 w-4 text-foreground transition-colors group-hover:text-primary"
					/>
				</a>
				<div class="p-6 text-center">
					<p class="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
						{data.komunity.total}
					</p>
					<p class="mt-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
						Total Item Komunity
					</p>
				</div>
			</div>
		{/if}

		<!-- Alat Perlu Perhatian -->
		<div class="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
			<div class="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-4">
				<AlertTriangle size={16} class="text-destructive" />
				<h3 class="text-sm font-bold tracking-wide text-foreground uppercase">
					Alat Perlu Perhatian
				</h3>
				<span class="ml-auto text-xs font-medium text-muted-foreground">
					{alatPerluPerhatian.length} item
				</span>
			</div>
			<div class="divide-y divide-border">
				{#each alatPerluPerhatian as eq (eq.id)}
					<a
						href={resolve('/(app)/[org_slug]/alat/[type]/[id]', {
							org_slug,
							type: 'alkomlek',
							id: eq.id
						})}
						class="flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-foreground">{eq.name}</p>
							<p class="font-mono text-[10px] text-muted-foreground">
								{eq.serialNumber || 'No SN'}
								{eq.brand ? `· ${eq.brand}` : ''}
							</p>
						</div>
						<span
							class="rounded px-2 py-1 text-[10px] font-bold {eq.condition === 'RUSAK_BERAT' ||
							eq.condition === 'RUSAK_TOTAL'
								? 'bg-destructive/10 text-destructive'
								: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}"
						>
							{eq.condition === 'RUSAK_RINGAN'
								? 'Rusak Ringan'
								: eq.condition === 'RUSAK_BERAT'
									? 'Rusak Berat'
									: 'Rusak Total'}
						</span>
					</a>
				{:else}
					<p class="px-5 py-8 text-center text-sm text-muted-foreground">
						Tidak ada alat yang memerlukan perhatian saat ini
					</p>
				{/each}
			</div>
		</div>
	</div>

	<!-- Right Column -->
	<div class="space-y-8">
		<!-- Pemeliharaan Mendatang -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<div class="mb-6 flex items-center justify-between">
				<h3
					class="flex items-center gap-2 text-sm font-bold tracking-wide text-foreground uppercase"
				>
					<Wrench size={16} class="text-primary" /> Pemeliharaan
				</h3>
				<span class="text-xs font-medium text-muted-foreground">{pemeliharaanPending.length}</span>
			</div>
			<div class="space-y-4">
				{#each pemeliharaanPending as m (m.id)}
					<a
						href={resolve('/(app)/[org_slug]/pemeliharaan/[id]', { org_slug, id: m.id })}
						class="group flex items-center gap-3"
					>
						<div class="rounded-full bg-muted p-2 text-muted-foreground">
							{#if m.status === 'IN_PROGRESS'}
								<Wrench size={14} />
							{:else}
								<Clock size={14} />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-foreground">{m.equipmentName}</p>
							<p class="text-[10px] text-muted-foreground">
								{m.serialNumber || 'No SN'} · {new Date(m.scheduledDate).toLocaleDateString(
									'id-ID'
								)}
							</p>
						</div>
					</a>
				{:else}
					<p class="text-center text-sm text-muted-foreground">Tidak ada jadwal pemeliharaan</p>
				{/each}
			</div>
			<a
				href={resolve('/(app)/[org_slug]/pemeliharaan', { org_slug })}
				class="group mt-6 flex w-full items-center justify-center gap-1 py-2 text-xs font-bold text-primary hover:text-primary/80"
			>
				Lihat Semua Pemeliharaan
				<ChevronRight size={14} class="transition-transform group-hover:translate-x-1" />
			</a>
		</div>

		<!-- Quick Actions -->
		<div class="rounded-2xl border border-border bg-card p-6 shadow-sm">
			<h3 class="mb-6 text-sm font-bold tracking-wide text-foreground uppercase">Aksi Cepat</h3>
			<div class="grid grid-cols-2 gap-3">
				{#if data.warehouseHeadType === 'ALL'}
					<!-- Mode gabungan: tampilkan ketiga link stok secara eksplisit, bukan 1 tombol generik -->
					<a
						href={resolve('/(app)/[org_slug]/stok/balkir', { org_slug })}
						class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
					>
						<PackageCheck size={20} class="text-muted-foreground group-hover:text-primary" />
						<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
							>Stok Balkir</span
						>
					</a>
					<a
						href={resolve('/(app)/[org_slug]/stok/transito', { org_slug })}
						class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
					>
						<PackageCheck size={20} class="text-muted-foreground group-hover:text-primary" />
						<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
							>Stok Transito</span
						>
					</a>
					<a
						href={resolve('/(app)/[org_slug]/stok/komunity', { org_slug })}
						class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
					>
						<PackageCheck size={20} class="text-muted-foreground group-hover:text-primary" />
						<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
							>Stok Komunity</span
						>
					</a>
				{:else}
					<a
						href={resolve(stokRoute[data.warehouseHeadType] as '/(app)/[org_slug]/stok/balkir', {
							org_slug
						})}
						class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
					>
						<PackageCheck size={20} class="text-muted-foreground group-hover:text-primary" />
						<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
							>Stok Gudang</span
						>
					</a>
				{/if}
				<a
					href={resolve('/(app)/[org_slug]/mutasi', { org_slug })}
					class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
				>
					<ArrowLeftRight size={20} class="text-muted-foreground group-hover:text-primary" />
					<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
						>Mutasi</span
					>
				</a>
				<a
					href={resolve('/(app)/[org_slug]/pemeliharaan/create', { org_slug })}
					class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
				>
					<Wrench size={20} class="text-muted-foreground group-hover:text-primary" />
					<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
						>Tambah Perawatan</span
					>
				</a>
				<a
					href={resolve('/(app)/[org_slug]/distribusi', { org_slug })}
					class="flex flex-col items-center justify-center gap-2 rounded-xl border border-border p-4 text-center transition-all hover:border-primary/20 hover:bg-primary/5"
				>
					<Truck size={20} class="text-muted-foreground group-hover:text-primary" />
					<span class="text-[10px] font-bold tracking-wide text-muted-foreground uppercase"
						>Distribusi</span
					>
				</a>
			</div>
		</div>
	</div>
</div>
