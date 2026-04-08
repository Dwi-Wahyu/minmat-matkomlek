<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ChevronLeft, Save, Loader2 } from '@lucide/svelte';

	let { data } = $props();

	let loading = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let imagePreview = $state<string | null>(
		data.equipment.item.imagePath ? `/uploads/item/${data.equipment.item.imagePath}` : null
	);

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
			imagePreview = data.equipment.item.imagePath
				? `/uploads/item/${data.equipment.item.imagePath}`
				: null;
		}
	}

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function handleAction() {
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/alat/${data.type}`;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Edit {typeLabel}</h1>
			<p class="text-muted-foreground">Perbarui informasi peralatan yang sudah ada.</p>
		</div>
	</div>

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			loading = true;
			return ({ result }) => {
				loading = false;
				if (result.type === 'success') {
					notificationMsg = 'Berhasil';
					notificationType = 'success';
					notificationOpen = true;
				} else if (result.type === 'failure') {
					notificationMsg = 'Terjadi kesalahan';
					notificationType = 'error';
					notificationOpen = true;
				}
			};
		}}
		class="grid gap-8 rounded-lg border bg-card p-8 shadow-sm"
	>
		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="itemName">Nama Alat</Label>
				<Input
					name="itemName"
					id="itemName"
					required
					placeholder="Contoh: Radio HT, Jammer..."
					value={data.equipment.item.name}
				/>
				<p class="text-xs text-muted-foreground">Nama spesifik atau model peralatan.</p>
			</div>

			<div class="space-y-2">
				<Label for="serialNumber">Serial Number (SN)</Label>
				<Input
					name="serialNumber"
					id="serialNumber"
					placeholder="Contoh: SN-12345678"
					value={data.equipment.serialNumber}
				/>
			</div>

			<div class="space-y-2">
				<Label for="brand">Brand / Merek</Label>
				<Input
					name="brand"
					id="brand"
					placeholder="Contoh: Motorola, Kenwood..."
					value={data.equipment.brand}
				/>
			</div>

			<div class="space-y-2">
				<Label for="warehouseId">Gudang Penyimpanan</Label>
				<select
					name="warehouseId"
					id="warehouseId"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					value={data.equipment.warehouseId}
				>
					<option value="">Tanpa Gudang (Langsung ke Satuan)</option>
					{#each data.warehouses as warehouse (warehouse.id)}
						<option value={warehouse.id}>{warehouse.name}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="condition">Kondisi Alat</Label>
				<select
					name="condition"
					id="condition"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					value={data.equipment.condition}
				>
					<option value="BAIK">Baik</option>
					<option value="RUSAK_RINGAN">Rusak Ringan</option>
					<option value="RUSAK_BERAT">Rusak Berat</option>
				</select>
			</div>

			<div class="space-y-2">
				<Label for="status">Status Aset</Label>
				<select
					name="status"
					id="status"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
					value={data.equipment.status}
				>
					<option value="READY">Ready (Tersedia)</option>
					<option value="IN_USE">In Use (Digunakan)</option>
					<option value="TRANSIT">Transit (Dalam Pengiriman)</option>
					<option value="MAINTENANCE">Maintenance (Perbaikan)</option>
				</select>
			</div>

			<div class="space-y-2 md:col-span-2">
				<Label for="image">Gambar Peralatan</Label>
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
						<p class="text-xs text-muted-foreground">
							Maksimal 5MB. Format: PNG, JPG, JPEG. (Kosongkan jika tidak ingin mengubah)
						</p>
					</div>
				</div>
			</div>
		</div>

		<div class="flex justify-end gap-3 border-t pt-6">
			<Button variant="outline" href="/{page.params.org_slug}/alat/{data.type}" disabled={loading}>
				Batal
			</Button>
			<Button type="submit" class="min-w-[120px] gap-2" disabled={loading}>
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

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={handleAction}
/>
