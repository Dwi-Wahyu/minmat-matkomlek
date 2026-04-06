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

	const conditionOptions = [
		{ value: 'BAIK', label: 'BAIK' },
		{ value: 'RUSAK', label: 'RUSAK' }
	];

	const statusOptions = [
		{ value: 'MILIK_TNI', label: 'MILIK TNI' },
		{ value: 'SEWA', label: 'SEWA' }
	];

	let selectedCondition = $state(
		conditionOptions.find((o) => o.value === data.building.condition)?.value ??
			conditionOptions[0].value
	);
	let selectedStatus = $state(
		statusOptions.find((o) => o.value === data.building.status)?.value ?? statusOptions[0].value
	);

	const conditionTrigger = $derived(
		conditionOptions.find((o) => o.value === selectedCondition)?.label ?? 'Pilih Kondisi'
	);
	const statusTrigger = $derived(
		statusOptions.find((o) => o.value === selectedStatus)?.label ?? 'Pilih Status'
	);
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="mx-auto w-full max-w-3xl">
		<div class="mb-4">
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Edit Data Bangunan</h1>
			<p class="text-sm text-muted-foreground">Perbarui informasi data bangunan di bawah ini.</p>
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
								goto(`/${page.params.org_slug}/bangunan`);
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
						<Label for="code">Kode Bangunan *</Label>
						<Input id="code" name="code" value={data.building.code} required />
					</div>

					<div class="space-y-2">
						<Label for="name">Nama Bangunan *</Label>
						<Input id="name" name="name" value={data.building.name} required />
					</div>

					<div class="space-y-2">
						<Label for="type">Tipe / Fungsi *</Label>
						<Input id="type" name="type" value={data.building.type} required />
					</div>

					<div class="space-y-2">
						<Label for="area">Luas Bangunan (m²) *</Label>
						<Input
							id="area"
							name="area"
							type="number"
							step="0.01"
							value={data.building.area}
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="condition">Kondisi *</Label>
						<Select.Root type="single" name="condition" bind:value={selectedCondition}>
							<Select.Trigger class="w-full">
								{conditionTrigger}
							</Select.Trigger>
							<Select.Content>
								{#each conditionOptions as option}
									<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item
									>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="status">Status *</Label>
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
						<Label for="location">Lokasi / Alamat *</Label>
						<Textarea id="location" name="location" value={data.building.location} required />
					</div>

					<div class="space-y-2">
						<Label for="latitude">Latitude (Opsional)</Label>
						<Input id="latitude" name="latitude" value={data.building.latitude} />
					</div>

					<div class="space-y-2">
						<Label for="longitude">Longitude (Opsional)</Label>
						<Input id="longitude" name="longitude" value={data.building.longitude} />
					</div>

					<div class="col-span-1 space-y-2 md:col-span-2">
						<Label for="description">Keterangan Tambahan</Label>
						<Textarea id="description" name="description" value={data.building.description} />
					</div>
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{page.params.org_slug}/bangunan" disabled={loading}>
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
