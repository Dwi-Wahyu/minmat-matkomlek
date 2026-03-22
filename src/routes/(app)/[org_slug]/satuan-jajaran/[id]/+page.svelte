<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import {
		Search,
		ChevronLeft,
		Building2,
		Package,
		Info,
		Handshake,
		Radio,
		Zap,
		Box
	} from '@lucide/svelte';

	let { data } = $props();

	const conditionColors: Record<string, string> = {
		BAIK: 'bg-green-100 text-green-700 border-green-200',
		RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
		RUSAK_BERAT: 'bg-red-100 text-red-700 border-red-200'
	};

	const statusColors: Record<string, string> = {
		READY: 'bg-blue-100 text-blue-700 border-blue-200',
		IN_USE: 'bg-purple-100 text-purple-700 border-purple-200',
		TRANSIT: 'bg-orange-100 text-orange-700 border-orange-200',
		MAINTENANCE: 'bg-red-100 text-red-700 border-red-200'
	};
</script>

<div class="mx-auto flex w-full flex-col gap-6 p-6">
	<!-- Header & Back Button -->
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/{page.params.org_slug}/satuan-jajaran">
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Satuan</h1>
			<p class="text-sm text-muted-foreground">Informasi lengkap dan inventaris material satuan.</p>
		</div>
	</div>

	<!-- Unit Info Card -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center gap-4 pb-4">
			<div class="rounded-full bg-blue-100 p-3 text-blue-600">
				<Building2 class="size-6" />
			</div>
			<div>
				<Card.Title class="text-2xl">{data.targetOrg.name}</Card.Title>
				<Card.Description>Slug: {data.targetOrg.slug}</Card.Description>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				<div class="flex flex-col gap-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">ID Satuan</span>
					<code class="font-mono text-sm">{data.targetOrg.id}</code>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Tipe Satuan</span>
					<span class="text-sm">Organisasi / Satuan Jajaran</span>
				</div>
				<div class="flex flex-col gap-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase"
						>Terakhir Diperbarui</span
					>
					<span class="text-sm">{new Date().toLocaleDateString('id-ID')}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Inventory Section -->
	<div class="space-y-4">
		<div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
			<div class="flex flex-1 flex-col gap-2">
				<h2 class="flex items-center gap-2 text-xl font-bold">
					<Package class="size-5" />
					Daftar Inventaris
				</h2>
				<!-- Filters -->
				<div class="flex flex-wrap gap-2">
					<Button
						variant={data.filters.type === 'ALL' ? 'default' : 'outline'}
						size="sm"
						href="?type=ALL&q={data.filters.q}"
						class="gap-1.5"
					>
						Semua
					</Button>
					<Button
						variant={data.filters.type === 'ALKOMLEK' ? 'default' : 'outline'}
						size="sm"
						href="?type=ALKOMLEK&q={data.filters.q}"
						class="gap-1.5"
					>
						<Radio class="size-3.5" />
						Alkomlek
					</Button>
					<Button
						variant={data.filters.type === 'PERNIKA_LEK' ? 'default' : 'outline'}
						size="sm"
						href="?type=PERNIKA_LEK&q={data.filters.q}"
						class="gap-1.5"
					>
						<Zap class="size-3.5" />
						Pernika & Lek
					</Button>
					<Button
						variant={data.filters.type === 'CONSUMABLE' ? 'default' : 'outline'}
						size="sm"
						href="?type=CONSUMABLE&q={data.filters.q}"
						class="gap-1.5"
					>
						<Box class="size-3.5" />
						Habis Pakai
					</Button>
				</div>
			</div>

			<div class="relative w-full md:w-72">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<form method="GET">
					<input type="hidden" name="type" value={data.filters.type} />
					<Input name="q" placeholder="Cari nama barang..." class="pl-10" value={data.filters.q} />
				</form>
			</div>
		</div>

		<!-- Table -->
		<div class="overflow-hidden rounded-lg border bg-card shadow-sm">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head>Nama Barang</Table.Head>
						<Table.Head>Tipe</Table.Head>
						<Table.Head>Serial / Brand</Table.Head>
						<Table.Head>Stok</Table.Head>
						<Table.Head>Gudang</Table.Head>
						<Table.Head>Kondisi</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.inventory as item (item.id)}
						<Table.Row class="transition-colors hover:bg-muted/30">
							<Table.Cell>
								<div class="flex flex-col">
									<span class="font-semibold">{item.name}</span>
									<span class="text-xs tracking-tight text-muted-foreground uppercase">
										{item.type === 'ASSET' ? item.equipmentType || 'ALAT' : 'HABIS PAKAI'}
									</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								{#if item.type === 'ASSET'}
									<Badge variant="outline" class="border-blue-200 bg-blue-50 text-blue-700"
										>Aset</Badge
									>
								{:else}
									<Badge variant="outline" class="border-orange-200 bg-orange-50 text-orange-700"
										>BHP</Badge
									>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<div class="flex flex-col gap-0.5">
									<code class="font-mono text-xs">{item.serialNumber || '-'}</code>
									<span class="text-xs text-muted-foreground">{item.brand || '-'}</span>
								</div>
							</Table.Cell>
							<Table.Cell>
								<span class="font-bold">{item.qty}</span>
								<span class="ml-1 text-xs text-muted-foreground">{item.unit}</span>
							</Table.Cell>
							<Table.Cell>
								<span class="text-xs">{item.warehouseName || '-'}</span>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="outline" class={conditionColors[item.condition]}>
									{item.condition}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<Badge variant="secondary" class={statusColors[item.status]}>
									{item.status.replace('_', ' ')}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-2">
									{#if item.type === 'ASSET'}
										<Button
											size="sm"
											variant="outline"
											class="h-8 gap-1"
											href="/{page.params
												.org_slug}/peminjaman/create?equipmentId={item.id}&targetOrgId={data
												.targetOrg.id}"
											disabled={item.status !== 'READY'}
										>
											<Handshake class="size-3.5" />
											Pinjam
										</Button>
									{/if}
									<Button
										size="sm"
										variant="ghost"
										class="h-8 gap-1"
										href="/{page.params.org_slug}/alat/{item.equipmentType?.toLowerCase() ||
											'barang'}/{item.id}"
									>
										<Info class="size-3.5" />
										Detail
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={8} class="h-32 text-center text-muted-foreground">
								Tidak ada inventaris ditemukan untuk satuan ini.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
</div>
