<script lang="ts">
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { 
		ChevronLeft, 
		Package, 
		MapPin, 
		History, 
		Handshake, 
		Building2,
		Calendar
	} from '@lucide/svelte';

	let { data } = $props();

	const conditionColors: Record<string, string> = {
		BAIK: 'bg-green-100 text-green-700 border-green-200',
		RUSAK_RINGAN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
		RUSAK_BERAT: 'bg-red-100 text-red-700 border-red-200'
	};

	const statusColors: Record<string, string> = {
		READY: 'bg-blue-100 text-blue-700',
		IN_USE: 'bg-purple-100 text-purple-700',
		TRANSIT: 'bg-orange-100 text-orange-700',
		MAINTENANCE: 'bg-red-100 text-red-700'
	};
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={() => history.back()}>
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Alat</h1>
				<p class="text-muted-foreground text-sm">Informasi spesifik dan lokasi aset.</p>
			</div>
		</div>
		<Button 
			class="gap-2" 
			href="/{page.params.org_slug}/peminjaman/create?equipmentId={data.equipment.id}&targetOrgId={data.equipment.organizationId}"
			disabled={data.equipment.status !== 'READY'}
		>
			<Handshake class="size-4" />
			Pinjam Alat
		</Button>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		{#if data.equipment.imagePath}
			<Card.Root class="md:col-span-3 overflow-hidden">
				<div class="flex flex-col md:flex-row gap-6 p-6">
					<div class="size-64 shrink-0 overflow-hidden rounded-lg border bg-muted shadow-sm">
						<img 
							src="/uploads/equipment/{data.equipment.imagePath}" 
							alt={data.equipment.item.name} 
							class="size-full object-cover"
						/>
					</div>
					<div class="flex flex-col justify-center gap-2">
						<h2 class="text-2xl font-bold">{data.equipment.item.name}</h2>
						<p class="text-muted-foreground">{data.equipment.brand || 'Tanpa Brand'} • {data.equipment.serialNumber || 'Tanpa SN'}</p>
						<div class="mt-2 flex gap-2">
							<Badge variant="outline" class={conditionColors[data.equipment.condition]}>
								{data.equipment.condition.replace('_', ' ')}
							</Badge>
							<Badge variant="secondary" class={statusColors[data.equipment.status]}>
								{data.equipment.status.replace('_', ' ')}
							</Badge>
						</div>
					</div>
				</div>
			</Card.Root>
		{/if}

		<!-- Main Info -->
		<Card.Root class={data.equipment.imagePath ? 'md:col-span-2' : 'md:col-span-2'}>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Package class="size-5 text-blue-600" />
					{data.equipment.item.name}
				</Card.Title>
				<Card.Description>ID Aset: {data.equipment.id}</Card.Description>
			</Card.Header>
			<Card.Content class="grid grid-cols-2 gap-y-6 gap-x-4">
				<div class="space-y-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Serial Number</span>
					<p class="font-mono text-lg">{data.equipment.serialNumber || '-'}</p>
				</div>
				<div class="space-y-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Brand / Merek</span>
					<p class="text-lg">{data.equipment.brand || '-'}</p>
				</div>
				<div class="space-y-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Kondisi</span>
					<div>
						<Badge variant="outline" class={conditionColors[data.equipment.condition]}>
							{data.equipment.condition.replace('_', ' ')}
						</Badge>
					</div>
				</div>
				<div class="space-y-1">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Status Operasional</span>
					<div>
						<Badge variant="secondary" class={statusColors[data.equipment.status]}>
							{data.equipment.status.replace('_', ' ')}
						</Badge>
					</div>
				</div>
				<div class="space-y-1 col-span-2">
					<span class="text-xs font-semibold text-muted-foreground uppercase">Deskripsi Item</span>
					<p class="text-sm text-muted-foreground">{data.equipment.item.description || 'Tidak ada deskripsi.'}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Location Info -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<MapPin class="size-5 text-red-600" />
					Lokasi Saat Ini
				</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-6">
				<div class="flex items-start gap-3">
					<Building2 class="size-5 mt-0.5 text-muted-foreground" />
					<div>
						<span class="text-xs font-semibold text-muted-foreground uppercase">Satuan Pemilik</span>
						<p class="text-sm font-medium">{data.equipment.warehouse?.organization?.name || 'Tidak diketahui'}</p>
					</div>
				</div>
				<div class="flex items-start gap-3">
					<Package class="size-5 mt-0.5 text-muted-foreground" />
					<div>
						<span class="text-xs font-semibold text-muted-foreground uppercase">Gudang</span>
						<p class="text-sm font-medium">{data.equipment.warehouse?.name || 'Tanpa Gudang'}</p>
						<p class="text-xs text-muted-foreground">{data.equipment.warehouse?.location || '-'}</p>
					</div>
				</div>
				<div class="pt-4 border-t">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<Calendar class="size-3.5" />
						Terdaftar pada {new Date(data.equipment.createdAt).toLocaleDateString('id-ID')}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- History Timeline -->
		<Card.Root class="md:col-span-3">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<History class="size-5 text-purple-600" />
					Riwayat Pergerakan Terakhir
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
					{#each data.history as log (log.id)}
						<div class="relative flex items-center justify-between md:justify-start md:odd:flex-row-reverse group is-active">
							<div class="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
								<Package class="size-5" />
							</div>
							<div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 bg-white shadow">
								<div class="flex items-center justify-between space-x-2 mb-1">
									<div class="font-bold text-slate-900">{log.eventType.replace('_', ' ')}</div>
									<time class="font-mono text-xs text-blue-500">{new Date(log.createdAt).toLocaleDateString()}</time>
								</div>
								<div class="text-slate-500 text-sm">
									{log.notes || `Pergerakan material dari ${log.fromWarehouse?.name || 'Sumber'} ke ${log.toWarehouse?.name || 'Tujuan'}`}
								</div>
							</div>
						</div>
					{:else}
						<p class="text-center text-muted-foreground py-8">Belum ada riwayat pergerakan untuk alat ini.</p>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
