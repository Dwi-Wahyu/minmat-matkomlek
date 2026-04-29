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

	const typeLabel = $derived(data.type === 'alpernika' ? 'Pernika & Lek' : 'Alkomlek');

	function handleAction() {
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/alat/${data.type}`;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" href="/{page.params.org_slug}/alat/{data.type}">
			<ChevronLeft class="size-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground">Tambah {typeLabel}</h1>
			<p class="text-muted-foreground">Masukkan informasi peralatan baru ke dalam sistem.</p>
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
				<Input name="itemName" id="itemName" required placeholder="Contoh: Radio HT, Jammer..." />
				<p class="text-xs text-muted-foreground">Nama spesifik atau model peralatan.</p>
			</div>

			<div class="space-y-2">
				<Label for="serialNumber">Serial Number (SN)</Label>
				<Input name="serialNumber" id="serialNumber" placeholder="Contoh: SN-12345678" />
				<p class="text-xs text-muted-foreground">Nomor seri unik untuk alat ini</p>
			</div>

			<div class="space-y-2">
				<Label for="brand">Brand / Merek</Label>
				<Input name="brand" id="brand" placeholder="Contoh: Motorola, Kenwood..." />
			</div>

			<div class="space-y-2">
				<Label for="warehouseId">Gudang Penyimpanan</Label>
				<select
					name="warehouseId"
					id="warehouseId"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
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
				>
					<option value="READY">Ready (Tersedia)</option>
					<option value="IN_USE">In Use (Digunakan)</option>
					<option value="TRANSIT">Transit (Dalam Pengiriman)</option>
					<option value="MAINTENANCE">Maintenance (Perbaikan)</option>
				</select>
			</div>

			<div class="space-y-2">
				<Label for="classification">Klasifikasi Mutasi</Label>
				<select
					name="classification"
					id="classification"
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<option value="">-- Pilih Klasifikasi --</option>
					<option value="TRANSITO">Transito</option>
					<option value="BALKIR">Balkir</option>
					<option value="KOMUNITY">Komunity</option>
				</select>
				<p class="text-xs text-muted-foreground">Catat mutasi awal saat penambahan alat.</p>
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
						<p class="text-xs text-muted-foreground">Maksimal 5MB. Format: PNG, JPG, JPEG.</p>
					</div>
				</div>
			</div>
		</div>

		<div class="flex justify-end gap-3 border-t pt-6">
			<Button variant="outline" href="/{page.params.org_slug}/alat/{data.type}" disabled={loading}>
				Batal
			</Button>
			<Button type="submit" class="min-w-30 gap-2" disabled={loading}>
				{#if loading}
					<Loader2 class="size-4 animate-spin" />
					Menyimpan...
				{:else}
					<Save class="size-4" />
					Simpan Alat
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
