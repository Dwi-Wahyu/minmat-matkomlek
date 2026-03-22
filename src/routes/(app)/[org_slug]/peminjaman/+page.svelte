<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import { 
		Search, 
		Plus, 
		Eye, 
		Clock, 
		CheckCircle2, 
		XCircle, 
		Package, 
		RotateCcw,
		Filter
	} from '@lucide/svelte';

	let { data } = $props();

	const statusConfig = {
		DRAFT: { label: 'Menunggu', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
		APPROVED: { label: 'Disetujui', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
		REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
		DIPINJAM: { label: 'Dipinjam', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: Package },
		KEMBALI: { label: 'Kembali', color: 'bg-green-100 text-green-700 border-green-200', icon: RotateCcw }
	};

	function formatDate(date: any) {
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Tracking Peminjaman</h1>
			<p class="text-muted-foreground">Pantau status pengajuan dan penggunaan alat antar satuan.</p>
		</div>
		<Button href="/{page.params.org_slug}/peminjaman/create" class="gap-2">
			<Plus class="size-4" />
			Buat Pengajuan
		</Button>
	</div>

	<div class="flex flex-col md:flex-row items-center gap-4 rounded-lg border bg-card p-4 shadow-sm">
		<div class="relative flex-1 w-full">
			<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<form method="GET" class="w-full">
				<Input
					name="q"
					placeholder="Cari berdasarkan unit peminjam..."
					class="pl-10"
					value={data.filters.q}
				/>
			</form>
		</div>
		<div class="flex items-center gap-2">
			<Filter class="size-4 text-muted-foreground" />
			<div class="flex gap-1">
				{#each ['ALL', 'DRAFT', 'APPROVED', 'DIPINJAM', 'KEMBALI', 'REJECTED'] as status}
					<Button 
						variant={data.filters.status === status ? 'default' : 'outline'} 
						size="sm"
						href="?status={status}&q={data.filters.q}"
						class="text-[10px] h-7 px-2"
					>
						{status}
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<div class="rounded-lg border bg-card shadow-sm overflow-hidden">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head>Unit Peminjam</Table.Head>
					<Table.Head>Tujuan</Table.Head>
					<Table.Head>Satuan Pemilik</Table.Head>
					<Table.Head>Tanggal Pinjam</Table.Head>
					<Table.Head>Status</Table.Head>
					<Table.Head class="text-right">Aksi</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.lendingList as item (item.id)}
					{@const config = statusConfig[item.status as keyof typeof statusConfig]}
					<Table.Row class="hover:bg-muted/30 transition-colors">
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-bold">{item.unit}</span>
								<span class="text-xs text-muted-foreground">Oleh: {item.requestedByUser?.name}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class="text-[10px] uppercase font-bold">{item.purpose}</Badge>
						</Table.Cell>
						<Table.Cell>
							<span class="text-sm font-medium">{item.organization?.name}</span>
						</Table.Cell>
						<Table.Cell>
							<div class="flex flex-col text-xs">
								<span>{formatDate(item.startDate)}</span>
								<span class="text-muted-foreground">s/d {formatDate(item.endDate)}</span>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class={config.color}>
								<config.icon class="size-3 mr-1" />
								{config.label}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button variant="ghost" size="icon" href="/{page.params.org_slug}/peminjaman/{item.id}">
								<Eye class="size-4 text-blue-600" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={6} class="h-32 text-center text-muted-foreground">
							Tidak ada data peminjaman yang ditemukan.
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
