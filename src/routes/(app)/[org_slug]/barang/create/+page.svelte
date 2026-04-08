<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ArrowLeft } from '@lucide/svelte';

	let { data } = $props();

	let isLoading = $state(false);

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State untuk form internal (hanya untuk Select)
	let selectedBaseUnit = $state('');
	let selectedWarehouseId = $state('');

	let imagePreview = $state<string | null>(null);

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
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

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification(message: string) {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = message;
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message || 'Terjadi kesalahan saat menyimpan data.';
		notificationActionLabel = 'Coba Lagi';
		showNotification = true;
	}

	// Handler untuk aksi setelah notifikasi
	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			goto(`/${data.org_slug}/barang`);
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-8 p-8">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href="/{data.org_slug}/barang"
				class="rounded-full shadow-sm"
			>
				<ArrowLeft size={18} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-slate-900">
					Tambah Barang Habis Pakai
				</h1>
				<p class="text-sm text-slate-500">Daftarkan definisi barang baru untuk inventaris.</p>
			</div>
		</div>
	</div>

	<Card.Root class="overflow-hidden border-slate-200 shadow-sm">
		<Card.Content class="p-8">
			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isLoading = true;
					return async ({ result }) => {
						isLoading = false;
						if (result.type === 'success') {
							showSuccessNotification('Data barang berhasil disimpan.');
						} else if (result.type === 'failure') {
							showErrorNotification(
								(result.data as any)?.message || 'Terjadi kesalahan saat menyimpan data.'
							);
						} else if (result.type === 'error') {
							showErrorNotification('Terjadi kesalahan sistem.');
						}
					};
				}}
				class="grid grid-cols-1 gap-6 md:grid-cols-2"
			>
				<!-- Hidden Inputs for Select Values -->
				<input type="hidden" name="baseUnit" value={selectedBaseUnit} />
				<input type="hidden" name="warehouseId" value={selectedWarehouseId} />

				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="image">Foto Barang</Label>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div
							class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-slate-50"
						>
							{#if imagePreview}
								<img src={imagePreview} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<div class="text-center text-xs text-slate-400">Belum ada foto</div>
							{/if}
						</div>
						<div class="flex-1">
							<Input
								type="file"
								name="image"
								id="image"
								accept="image/*"
								onchange={handleImageChange}
								class="cursor-pointer"
							/>
							<p class="mt-1.5 text-[10px] text-slate-500">
								Format: JPG, PNG, atau WEBP. Maks: 5MB.
							</p>
						</div>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="name">Nama Barang</Label>
					<Input type="text" name="name" id="name" required placeholder="Contoh: Baterai AA" />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="baseUnit">Satuan Dasar</Label>
					<Select.Root
						type="single"
						bind:value={selectedBaseUnit}
						onValueChange={(v) => (selectedBaseUnit = v)}
					>
						<Select.Trigger class="w-full">
							{selectedBaseUnit || 'Pilih Satuan'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="PCS">PCS</Select.Item>
							<Select.Item value="BOX">BOX</Select.Item>
							<Select.Item value="METER">METER</Select.Item>
							<Select.Item value="ROLL">ROLL</Select.Item>
							<Select.Item value="UNIT">UNIT</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="qty">Stok Awal</Label>
					<Input type="number" name="qty" id="qty" placeholder="0" min="0" step="0.01" />
				</div>

				<div class="flex flex-col gap-2">
					<Label for="warehouseId">Pilih Gudang (Jika ada stok awal)</Label>
					<Select.Root
						type="single"
						bind:value={selectedWarehouseId}
						onValueChange={(v) => (selectedWarehouseId = v)}
					>
						<Select.Trigger class="w-full">
							{data.warehouses.find((w: any) => w.id === selectedWarehouseId)?.name ||
								'Pilih Gudang'}
						</Select.Trigger>
						<Select.Content>
							{#each data.warehouses as warehouse}
								<Select.Item value={warehouse.id}>{warehouse.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="description">Deskripsi / Keterangan</Label>
					<Textarea
						name="description"
						id="description"
						placeholder="Tambahkan catatan singkat tentang barang ini..."
						class="min-h-24 rounded-lg border p-2.5 outline-none"
					/>
				</div>

				<div class="mt-4 flex gap-4 md:col-span-2">
					<Button
						variant="outline"
						class="flex-1 py-6"
						href="/{data.org_slug}/barang"
						disabled={isLoading}
					>
						Batal
					</Button>
					<Button type="submit" class="flex-1 bg-[#2D5A43] py-6 hover:bg-[#2D5A43]/90" disabled={isLoading}>
						{isLoading ? 'Menyimpan...' : 'Simpan Barang'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={showNotification}
	type={notificationType}
	title={notificationTitle}
	description={notificationDescription}
	actionLabel={notificationActionLabel}
	onAction={handleNotificationAction}
/>
