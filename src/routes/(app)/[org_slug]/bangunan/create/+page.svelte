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

	let selectedCondition = $state(conditionOptions[0].value);
	let selectedStatus = $state(statusOptions[0].value);

	const conditionTrigger = $derived(
		conditionOptions.find((o) => o.value === selectedCondition)?.label ?? 'Pilih Kondisi'
	);
	const statusTrigger = $derived(
		statusOptions.find((o) => o.value === selectedStatus)?.label ?? 'Pilih Status'
	);
	let imagePreview = $state<string | null>(null);

	function handleImageChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			imagePreview = null;
		}
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="mx-auto w-full max-w-3xl">
		<div class="mb-4 flex items-center gap-4">
			<Button variant="outline" size="icon" href="/{page.params.org_slug}/bangunan">
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Tambah Data Bangunan</h1>
				<p class="text-sm text-muted-foreground">
					Isi formulir di bawah untuk menambahkan data bangunan baru.
				</p>
			</div>
		</div>
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success') {
							notificationMsg = 'Data berhasil disimpan';
							notificationType = 'success';
							notificationOpen = true;
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
						<Input id="code" name="code" placeholder="Masukkan kode bangunan" required />
					</div>

					<div class="space-y-2">
						<Label for="name">Nama Bangunan *</Label>
						<Input id="name" name="name" placeholder="Masukkan nama bangunan" required />
					</div>

					<div class="space-y-2">
						<Label for="type">Tipe / Fungsi *</Label>
						<Input id="type" name="type" placeholder="Contoh: Kantor, Gudang, Mess" required />
					</div>

					<div class="space-y-2">
						<Label for="area">Luas Bangunan (m²) *</Label>
						<Input id="area" name="area" type="number" step="0.01" placeholder="0.00" required />
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
						<Textarea
							id="location"
							name="location"
							placeholder="Masukkan alamat lengkap lokasi bangunan"
							required
						/>
					</div>

					<div class="space-y-2">
						<Label for="latitude">Latitude (Opsional)</Label>
						<Input id="latitude" name="latitude" placeholder="Contoh: -6.123456" />
					</div>

					<div class="space-y-2">
						<Label for="longitude">Longitude (Opsional)</Label>
						<Input id="longitude" name="longitude" placeholder="Contoh: 106.123456" />
					</div>

					<div class="col-span-1 space-y-2 md:col-span-2">
						<Label for="image">Foto Bangunan</Label>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
							<div
								class="flex size-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted"
							>
								{#if imagePreview}
									<img src={imagePreview} alt="Preview" class="size-full object-cover" />
								{:else}
									<div class="text-center text-xs text-muted-foreground">No Image</div>
								{/if}
							</div>
							<div class="flex-1 space-y-2">
								<Input
									type="file"
									name="image"
									id="image"
									accept="image/png, image/jpeg, image/jpg"
									onchange={handleImageChange}
								/>
								<p class="text-xs text-muted-foreground">Maksimal 5MB. Format: PNG, JPG, JPEG.</p>
							</div>
						</div>
					</div>

					<div class="col-span-1 space-y-2 md:col-span-2">
						<Label for="description">Keterangan Tambahan</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="Catatan tambahan mengenai data bangunan"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-3">
					<Button variant="outline" href="/{page.params.org_slug}/bangunan" disabled={loading}>
						Batal
					</Button>
					<Button type="submit" class="gap-2" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" />
							Menyimpan...
						{:else}
							<Save class="size-4" />
							Simpan Data
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
	onAction={() => {
		if (notificationType === 'success') {
			goto(`/${page.params.org_slug}/bangunan`);
		}
	}}
/>
