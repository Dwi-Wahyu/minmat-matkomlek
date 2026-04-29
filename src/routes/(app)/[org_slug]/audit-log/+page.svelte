<script lang="ts">
	import {
		History,
		User,
		Table as TableIcon,
		Activity,
		Search,
		Calendar,
		Info,
		X,
		Filter
	} from '@lucide/svelte';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import Modal from '$lib/components/Modal.svelte';
	import Input from '@/components/ui/input/input.svelte';
	import Button from '@/components/ui/button/button.svelte';
	import { Label } from '@/components/ui/label';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();

	const logs = $derived(data.logs);
	let selectedLog = $state<any>(null);
	let isModalOpen = $state(false);
	let isFilterModalOpen = $state(false);

	// Filter states
	let searchQuery = $state(data.filters.search || '');
	let startDate = $state(data.filters.startDate || '');
	let endDate = $state(data.filters.endDate || '');

	function formatDate(date: Date) {
		return new Intl.DateTimeFormat('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(date));
	}

	function getActionColor(action: string) {
		const a = (action || '').toLowerCase();
		if (a.includes('create') || a.includes('insert'))
			return 'bg-emerald-50 text-emerald-700 border-emerald-100';
		if (a.includes('update') || a.includes('edit'))
			return 'bg-blue-50 text-blue-700 border-blue-100';
		if (a.includes('delete')) return 'bg-red-50 text-red-700 border-red-100';
		return 'bg-slate-50 text-slate-700 border-slate-100';
	}

	function showDetail(log: any) {
		selectedLog = log;
		isModalOpen = true;
	}

	function formatJson(json: string | null) {
		if (!json || json === 'null') return '-';
		try {
			if (typeof json === 'object') return JSON.stringify(json, null, 2);
			const obj = JSON.parse(json);
			return JSON.stringify(obj, null, 2);
		} catch (e) {
			return json;
		}
	}

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('search', searchQuery);
		else url.searchParams.delete('search');

		if (startDate) url.searchParams.set('start_date', startDate);
		else url.searchParams.delete('start_date');

		if (endDate) url.searchParams.set('end_date', endDate);
		else url.searchParams.delete('end_date');

		goto(url.toString(), { keepFocus: true, noScroll: true });
		isFilterModalOpen = false;
	}

	function resetFilters() {
		searchQuery = '';
		startDate = '';
		endDate = '';
		applyFilters();
	}

	let searchTimeout: any;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			applyFilters();
		}, 500);
	}
</script>

<div class="space-y-8 p-8">
	<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="flex items-center gap-3 text-2xl font-bold">Audit Log Sistem</h1>
			<p class="mt-1 text-slate-500">Memantau seluruh aktivitas perubahan data dalam sistem</p>
		</div>

		<div class="flex gap-3">
			<div class="relative">
				<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
				<Input
					type="text"
					placeholder="Cari aksi, tabel..."
					class="w-64 pl-10"
					bind:value={searchQuery}
					oninput={handleSearchInput}
				/>
			</div>
			<Button variant="outline" onclick={() => (isFilterModalOpen = true)} class="gap-2">
				<Calendar size={16} />
				{startDate || endDate ? 'Filter Aktif' : 'Filter Tanggal'}
				{#if startDate || endDate}
					<Badge variant="secondary" class="ml-1 h-5 px-1 text-[10px]">1</Badge>
				{/if}
			</Button>
			{#if searchQuery || startDate || endDate}
				<Button variant="ghost" onclick={resetFilters} class="px-2 text-slate-500">
					<X size={16} />
				</Button>
			{/if}
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl shadow-sm border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Waktu</Table.Head>
					<Table.Head>Pengguna</Table.Head>
					<Table.Head>Aksi</Table.Head>
					<Table.Head>Tabel</Table.Head>
					<Table.Head>ID Record</Table.Head>
					<Table.Head class="text-right">Detail</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each logs as log (log.id)}
					<Table.Row class="transition-colors hover:bg-slate-50/50">
						<Table.Cell class="font-medium">
							<div class="flex flex-col">
								<span class="">{formatDate(log.createdAt)}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
								>
									<User size={14} />
								</div>
								<div class="flex flex-col">
									<span class="text-sm font-semibold">{log.userName || 'System'}</span>
									<span class="font-mono text-[10px] text-slate-400">{log.userEmail || ''}</span>
								</div>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class={getActionColor(log.action || '')}>
								{log.action}
							</Badge>
						</Table.Cell>
						<Table.Cell>
							<div class="flex items-center gap-2 text-slate-600">
								<TableIcon size={14} class="text-slate-400" />
								<span class="font-mono text-xs">{log.tableName}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<span class="font-mono text-[10px] text-slate-400">{log.recordId || '-'}</span>
						</Table.Cell>
						<Table.Cell class="text-right">
							<button
								onclick={() => showDetail(log)}
								class="rounded-lg p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-900"
							>
								<Activity size={16} title="Lihat Perubahan" />
							</button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-64 text-center">
							<div class="flex flex-col items-center justify-center text-slate-400 gap-2">
								<History size={48} strokeWidth={1} />
								<p>Belum ada log aktivitas yang tercatat</p>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<div class="flex items-center justify-between border-t p-4">
			<span class="text-xs font-medium text-slate-400 italic">
				{#if logs.length > 0}
					Menampilkan {logs.length} aktivitas terbaru
				{:else}
					Tidak ada data yang ditemukan
				{/if}
			</span>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" disabled>Previous</Button>
				<Button variant="outline" size="sm" disabled>Next</Button>
			</div>
		</div>
	</div>
</div>

<!-- Modal Filter Tanggal -->
<Modal
	bind:show={isFilterModalOpen}
	title="Filter Berdasarkan Tanggal"
	description="Pilih rentang tanggal untuk mempersempit hasil audit log."
>
	<div class="space-y-4 py-4">
		<div class="grid grid-cols-2 gap-4">
			<div class="space-y-2">
				<Label for="start-date">Tanggal Mulai</Label>
				<Input type="date" id="start-date" bind:value={startDate} />
			</div>
			<div class="space-y-2">
				<Label for="end-date">Tanggal Akhir</Label>
				<Input type="date" id="end-date" bind:value={endDate} />
			</div>
		</div>
	</div>
	<div class="flex justify-end gap-3 pt-4">
		<Button variant="outline" onclick={() => (isFilterModalOpen = false)}>Batal</Button>
		<Button onclick={applyFilters}>Terapkan Filter</Button>
	</div>
</Modal>

<Modal
	bind:show={isModalOpen}
	title="Detail Perubahan Data"
	description="Berikut adalah detail data sebelum dan sesudah perubahan."
>
	{#if selectedLog}
		<div class="custom-scrollbar max-h-[60vh] space-y-6 overflow-y-auto pr-2">
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<TableIcon size={12} /> Tabel
					</p>
					<p class="font-mono font-bold text-slate-900">{selectedLog.tableName}</p>
				</div>
				<div class="rounded-xl border border-slate-100 bg-slate-50 p-3">
					<p
						class="mb-2 flex items-center gap-2 font-bold tracking-widest text-slate-400 uppercase"
					>
						<Activity size={12} /> Aksi
					</p>
					<Badge variant="outline" class={getActionColor(selectedLog.action)}>
						{selectedLog.action}
					</Badge>
				</div>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p
						class="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase"
					>
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						Nilai Lama
					</p>
				</div>
				<div class="group relative">
					<pre
						class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-emerald-400 shadow-inner">
						{formatJson(selectedLog.oldValue)}
					</pre>
				</div>
			</div>

			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<p
						class="flex items-center gap-2 text-xs font-bold tracking-widest text-slate-500 uppercase"
					>
						<span class="h-2 w-2 rounded-full bg-blue-500"></span>
						Nilai Baru
					</p>
				</div>
				<div class="group relative">
					<pre
						class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 font-mono text-[11px] leading-relaxed text-blue-400 shadow-inner">
						{formatJson(selectedLog.newValue)}
					</pre>
				</div>
			</div>
		</div>
	{/if}
</Modal>

<style>
	.custom-scrollbar::-webkit-scrollbar {
		width: 4px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #e2e8f0;
		border-radius: 10px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #cbd5e1;
	}
</style>
