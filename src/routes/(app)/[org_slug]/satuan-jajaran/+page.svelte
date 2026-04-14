<script lang="ts">
	import { Building2, ChevronRight, Info } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const defaultLogo = '/logo-tni-ad.png';
</script>

<div class="flex flex-col gap-6 p-6 text-foreground">
	<header>
		<h1 class="text-3xl font-bold tracking-tight uppercase">Satuan Jajaran</h1>
	</header>

	{#if data.units.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-12 text-muted-foreground"
		>
			<Info size={48} class="mb-4 opacity-20" />
			<p>Belum ada satuan jajaran yang terdaftar di bawah organisasi ini.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each data.units as unit}
				<Card.Root class="overflow-hidden border border-border bg-card text-card-foreground shadow-md transition-shadow hover:shadow-lg">
					<Card.Content class="p-6">
						<div class="flex items-start gap-4">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
							>
								<img
									src={unit.logoUrl || defaultLogo}
									alt="Logo {unit.name}"
									class="h-full w-full object-contain p-2"
								/>
							</div>

							<div class="flex-1 space-y-2">
								<h2 class="text-xl leading-tight font-bold text-foreground uppercase">
									{unit.name}
								</h2>
								<p class="line-clamp-2 text-xs text-muted-foreground">
									{unit.description || 'Tidak ada deskripsi tambahan untuk satuan ini.'}
								</p>
							</div>
						</div>

						<div class="mt-6 flex items-center justify-between border-t border-border pt-4">
							<div class="flex gap-1">
								<div class="h-1.5 w-8 rounded-full bg-primary"></div>
								<div class="h-1.5 w-4 rounded-full bg-muted"></div>
							</div>

							<Button
								href="satuan-jajaran/{unit.id}/"
								variant="secondary"
								class="flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
							>
								LIHAT DETAIL <ChevronRight size={14} />
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
