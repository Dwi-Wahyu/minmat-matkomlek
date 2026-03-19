<script lang="ts">
	import { Building2, ChevronRight, Info } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const defaultLogo = '/logo-tni-ad.png';
</script>

<div class="flex flex-col gap-6 p-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight uppercase">Satuan Jajaran</h1>
	</header>

	{#if data.units.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-slate-400"
		>
			<Info size={48} class="mb-4 opacity-20" />
			<p>Belum ada satuan jajaran yang terdaftar di bawah organisasi ini.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			{#each data.units as unit}
				<Card.Root class="overflow-hidden border-none shadow-md transition-shadow hover:shadow-lg">
					<Card.Content class="p-6">
						<div class="flex items-start gap-4">
							<div
								class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100"
							>
								<img
									src={unit.logoUrl || defaultLogo}
									alt="Logo {unit.name}"
									class="h-full w-full object-contain p-2"
								/>
							</div>

							<div class="flex-1 space-y-2">
								<h2 class="text-xl leading-tight font-bold text-slate-900 uppercase">
									{unit.name}
								</h2>
								<p class="line-clamp-2 text-xs text-slate-500">
									{unit.description || 'Tidak ada deskripsi tambahan untuk satuan ini.'}
								</p>
							</div>
						</div>

						<div class="mt-6 flex items-center justify-between border-t pt-4">
							<div class="flex gap-1">
								<div class="h-1.5 w-8 rounded-full bg-emerald-700"></div>
								<div class="h-1.5 w-4 rounded-full bg-slate-200"></div>
							</div>

							<Button
								href="/{unit.slug}/dashboard"
								variant="secondary"
								class="flex h-8 items-center gap-2 rounded-md bg-emerald-700 px-3 text-xs text-white hover:bg-emerald-800"
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
