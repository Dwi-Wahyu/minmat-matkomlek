<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { AlertCircle, Clock } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let {
		open = $bindable(false),
		reminders,
		orgSlug
	}: {
		open?: boolean;
		reminders: {
			lendingId: string;
			unit: string;
			equipmentName: string;
			serialNumber: string;
			endDate: Date;
			isOverdue: boolean;
		}[];
		orgSlug: string;
	} = $props();

	function formatDate(date: Date) {
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<AlertCircle class="size-5 text-orange-500" />
				Pengingat Pengembalian Alat
			</Dialog.Title>
			<Dialog.Description>
				Ada {reminders.length} alat yang perlu segera dikembalikan.
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-80 space-y-2 overflow-y-auto">
			{#each reminders as r, idx (r.lendingId + '-' + r.serialNumber + '-' + idx)}
				<a
					href={resolve('/(app)/[org_slug]/peminjaman/[id]', {
						org_slug: orgSlug,
						id: r.lendingId
					})}
					class="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50"
				>
					<div>
						<p class="font-medium">{r.equipmentName}</p>
						<p class="text-xs text-muted-foreground">S/N: {r.serialNumber} · {r.unit}</p>
					</div>
					<Badge
						variant="outline"
						class={r.isOverdue
							? 'border-red-200 bg-red-100 text-red-700'
							: 'border-yellow-200 bg-yellow-100 text-yellow-700'}
					>
						<Clock class="mr-1 size-3" />
						{r.isOverdue ? 'Terlambat' : `s/d ${formatDate(r.endDate)}`}
					</Badge>
				</a>
			{/each}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Tutup</Button>
			<Button
				href={resolve('/(app)/[org_slug]/peminjaman', { org_slug: orgSlug }) + '?tab=dipinjam'}
			>
				Lihat Semua
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
