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
		Filter,
		AlertCircle
	} from '@lucide/svelte';

	let { data } = $props();

	const statusConfig = {
		DRAFT: {
			label: 'Menunggu',
			color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
			icon: Clock
		},
		APPROVED: {
			label: 'Disetujui',
			color: 'bg-blue-100 text-blue-700 border-blue-200',
			icon: CheckCircle2
		},
		REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
		PERINTAH_LANGSUNG: {
			label: 'Perintah',
			color: 'bg-orange-100 text-orange-700 border-orange-200',
			icon: AlertCircle
		},
		DIPINJAM: {
			label: 'Dipinjam',
			color: 'bg-purple-100 text-purple-700 border-purple-200',
			icon: Package
		},
		KEMBALI: {
			label: 'Kembali',
			color: 'bg-green-100 text-green-700 border-green-200',
			icon: RotateCcw
		}
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
			<p class="text-muted-foreground">Pantau status pengajuan.</p>
		</div>
		<Button href="/{page.params.org_slug}/peminjaman/create" class="gap-2">
			<Plus class="size-4" />
			Buat Pengajuan
		</Button>
	</div>

	<div class="flex flex-col items-center gap-4 rounded-lg border bg-card p-4 shadow-sm md:flex-row">
		<div class="relative w-full flex-1">
			<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
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
				{#each ['ALL', 'DRAFT', 'APPROVED', 'PERINTAH_LANGSUNG', 'DIPINJAM', 'KEMBALI', 'REJECTED'] as status}
					<Button
						variant={data.filters.status === status ? 'default' : 'outline'}
						size="sm"
						href="?status={status}&q={data.filters.q}"
						class="h-7 px-2 text-[10px]"
					>
						{status}
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
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
					<Table.Row class="transition-colors hover:bg-muted/30">
						<Table.Cell>
							<div class="flex flex-col">
								<span class="font-bold">{item.unit}</span>
								<span class="text-xs text-muted-foreground">Oleh: {item.requestedByUser?.name}</span
								>
							</div>
						</Table.Cell>
						<Table.Cell>
							<Badge variant="outline" class="text-[10px] font-bold uppercase">{item.purpose}</Badge
							>
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
								<config.icon class="mr-1 size-3" />
								{config.label}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-right">
							<Button
								variant="ghost"
								size="icon"
								href="/{page.params.org_slug}/peminjaman/{item.id}"
							>
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
