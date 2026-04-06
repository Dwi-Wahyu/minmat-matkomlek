<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { ChevronLeft, Save, Loader2 } from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let loading = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	const statusOptions = [
		{ value: 'MILIK_TNI', label: 'MILIK TNI' },
		{ value: 'SEWA', label: 'SEWA' }
	];

	let selectedStatus = $state(
		statusOptions.find((o) => o.value === data.land.status)?.value ?? statusOptions[0].value
	);

	const statusTrigger = $derived(
		statusOptions.find((o) => o.value === selectedStatus)?.label ?? 'Pilih Status'
	);
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="mx-auto w-full max-w-3xl">
		<div class="mb-4">
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Edit Data Tanah</h1>
			<p class="text-sm text-muted-foreground">Perbarui informasi data tanah di bawah ini.</p>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success') {
							notificationMsg = 'Data berhasil diperbarui';
							notificationType = 'success';
							notificationOpen = true;
							setTimeout(() => {
								goto(`/${page.params.org_slug}/tanah`);
							}, 1500);
						} else if (result.type === 'failure') {
							notificationMsg = 'Terjadi kesalahan';
							notificationType = 'error';
							notificationOpen = true;
						}
					};
				}}
				class="space-y-6"
			>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="certificateNumber">Nomor Sertifikat</Label>
						<Input
							id="certificateNumber"
							name="certificateNumber"
							value={data.land.certificateNumber}
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="area">Luas Tanah (m²)</Label>
						<Input
							id="area"
							name="area"
							type="number"
							step="0.01"
							value={data.land.area}
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="usage">Peruntukan / Penggunaan</Label>
						<Input id="usage" name="usage" value={data.land.usage} required />
					</div>

					<div class="space-y-2">
						<Label for="status">Status</Label>
						<Select.Root type="single" name="status" bind:value={selectedStatus}>
							<Select.Trigger class="w-full">
								{statusTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each statusOptions as option}
									<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
									>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="col-span-1 space-y-2 md:col-span-2">
						<Label for="location">Lokasi / Alamat</Label>
						<Textarea id="location" name="location" value={data.land.location} required />
					</div>

					<div class="space-y-2">
						<Label for="latitude">Latitude (Opsional)</Label>
						<Input id="latitude" name="latitude" value={data.land.latitude} />
					</div>

					<div class="space-y-2">
						<Label for="longitude">Longitude (Opsional)</Label>
						<Input id="longitude" name="longitude" value={data.land.longitude} />
					</div>

					<div class="col-span-1 space-y-2 md:col-span-2">
						<Label for="description">Keterangan Tambahan</Label>
						<Textarea id="description" name="description" value={data.land.description} />
					</div>
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{page.params.org_slug}/tanah" disabled={loading}>
						Batal
					</Button>
					<Button type="submit" class="gap-2" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" />
							Memperbarui...
						{:else}
							<Save class="size-4" />
							Simpan Perubahan
						{/if}
					</Button>
				</div>
			</form>
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	description={notificationMsg}
/>
