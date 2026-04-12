<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { ArrowLeft, Save, Warehouse, MapPin } from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data, form } = $props();
	let loading = $state(false);
	let notificationOpen = $state(false);

	$effect(() => {
		if (form?.success) {
			notificationOpen = true;
		}
	});

	function handleBack() {
		goto(`/${page.params.org_slug}/gudang-management`);
	}
</script>

<div class="mx-auto max-w-2xl py-8">
	<Card.Root>
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			<Card.Content class="space-y-4">
				<div>
					<Card.Title>Edit Gudang</Card.Title>
					<Card.Description>Ubah informasi gudang terpilih.</Card.Description>
				</div>
				{#if form?.message}
					<div class="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
						{form.message}
					</div>
				{/if}

				<div class="space-y-2">
					<Label for="name">Nama Gudang</Label>
					<div class="relative">
						<Warehouse
							class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="name"
							name="name"
							value={data.warehouse.name}
							placeholder="Contoh: Gudang A, Transito 1, dll"
							class="pl-10"
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="location">Lokasi / Keterangan</Label>
					<div class="relative">
						<MapPin class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							id="location"
							name="location"
							value={data.warehouse.location || ''}
							placeholder="Contoh: Lantai 1, Sayap Kiri, dll"
							class="pl-10"
						/>
					</div>
				</div>
				<div class="flex justify-end gap-3">
					<Button variant="outline" onclick={handleBack} disabled={loading}>Batal</Button>
					<Button type="submit" disabled={loading} class="gap-2">
						{#if loading}
							<div
								class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
							></div>
							Menyimpan...
						{:else}
							<Save class="size-4" />
							Simpan Perubahan
						{/if}
					</Button>
				</div>
			</Card.Content>
		</form>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type="success"
	title="Berhasil"
	description={form?.message || 'Perubahan gudang berhasil disimpan'}
	onAction={() => {
		notificationOpen = false;
		handleBack();
	}}
/>
