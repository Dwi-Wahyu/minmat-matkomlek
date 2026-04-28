<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import {
		ArrowLeft,
		ArrowRightLeft,
		Package,
		MapPin,
		ClipboardList,
		BookOpen,
		Info
	} from '@lucide/svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data, form } = $props();

	let loading = $state(false);
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	let guideOpen = $state(false);

	// Form states
	let eventType = $state('RECEIVE');
	let classification = $state('KOMUNITY');
	let toWarehouseId = $state(data.equipment.warehouseId || '');
	let specificLocationName = $state('');
	let notes = $state('');

	$effect(() => {
		if (form?.success) {
			notificationMsg = form.message || 'Mutasi berhasil dicatat';
			notificationType = 'success';
			notificationOpen = true;
		} else if (form?.message) {
			notificationMsg = form.message;
			notificationType = 'error';
			notificationOpen = true;
		}
	});

	function handleBack() {
		goto(`/${page.params.org_slug}/alat/${data.type}`);
	}

	const eventTypes = [
		{ value: 'RECEIVE', label: 'Penerimaan / Masuk (Eksternal)' },
		{ value: 'ISSUE', label: 'Pengeluaran / Keluar (Permanen)' },
		{ value: 'TRANSFER_OUT', label: 'Transfer Keluar (Internal)' },
		{ value: 'TRANSFER_IN', label: 'Transfer Masuk (Internal)' }
	];

	const eventDescriptions = {
		RECEIVE:
			'Barang masuk dari luar sistem (pengadaan/hibah). Gudang asal kosong, status menjadi READY.',
		ISSUE:
			'Barang keluar sistem secara permanen (penghapusan/lelang). Gudang tujuan kosong, data alat dihapus dari stok aktif.',
		TRANSFER_OUT:
			'Kirim barang antar gudang internal. Status menjadi TRANSIT (tidak bisa dipinjam/digunakan di jalan).',
		TRANSFER_IN:
			'Konfirmasi barang sampai di gudang tujuan. Status kembali menjadi READY di lokasi baru.'
	};

	const selectedEventDescription = $derived(
		eventDescriptions[eventType as keyof typeof eventDescriptions]
	);

	const classifications = [
		{ value: 'KOMUNITY', label: 'Komunity' },
		{ value: 'BALKIR', label: 'Balkir' },
		{ value: 'TRANSITO', label: 'Transito' }
	];

	// Derived logic for UI
	const needsToWarehouse = $derived(['RECEIVE', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(eventType));
	const showFromWarehouse = $derived(['ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN'].includes(eventType));
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-6 py-6">
	<div class="flex items-center justify-between px-6 md:px-0">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleBack}>
				<ArrowLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Catat Mutasi Alat</h1>
				<p class="text-sm text-muted-foreground">
					Sesuai aturan bisnis mutasi inventaris Puskomlekad.
				</p>
			</div>
		</div>
		<Button variant="outline" class="gap-2" onclick={() => (guideOpen = true)}>
			<BookOpen class="size-4" />
			Baca Panduan
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Info Alat -->
		<Card.Root class="md:col-span-1">
			<Card.Content class="space-y-4">
				<div>
					<Card.Title class="text-lg">Detail Alat</Card.Title>
				</div>

				{#if data.equipment.item.imagePath}
					<img
						src="/uploads/item/{data.equipment.item.imagePath}"
						alt={data.equipment.item.name}
						class="aspect-square w-full rounded-lg border object-cover shadow-sm"
					/>
				{:else}
					<div
						class="flex aspect-square w-full items-center justify-center rounded-lg border bg-muted"
					>
						<Package class="size-12 text-muted-foreground/30" />
					</div>
				{/if}
				<div>
					<Label class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>Nama Barang</Label
					>
					<p class="font-medium">{data.equipment.item.name}</p>
				</div>
				<div>
					<Label class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>Serial Number</Label
					>
					<p class="font-mono text-sm">{data.equipment.serialNumber || '-'}</p>
				</div>
				<div>
					<Label class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>Status & Kondisi</Label
					>
					<p class="text-sm">
						<span class="font-medium">{data.equipment.status}</span> • {data.equipment.condition}
					</p>
				</div>
				<div>
					<Label class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
						>Lokasi Saat Ini</Label
					>
					<p class="font-medium">{data.equipment.warehouse?.name || 'Tanpa Gudang'}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Form Mutasi -->
		<div class="md:col-span-2">
			<Card.Root class="mb-0">
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
					<Card.Content class="space-y-6">
						<div>
							<Card.Title class="text-lg">Informasi Mutasi</Card.Title>
							<Card.Description>Lengkapi data perpindahan di bawah ini.</Card.Description>
						</div>

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="eventType">Jenis Kejadian</Label>
								<select
									id="eventType"
									name="eventType"
									bind:value={eventType}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									{#each eventTypes as type}
										<option value={type.value}>{type.label}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-2">
								<Label for="classification">Klasifikasi</Label>
								<select
									id="classification"
									name="classification"
									bind:value={classification}
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									{#each classifications as cl}
										<option value={cl.value}>{cl.label}</option>
									{/each}
								</select>
							</div>
						</div>

						{#if selectedEventDescription}
							<div
								class="flex items-start gap-3 rounded-lg border bg-blue-50/50 p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
							>
								<Info class="mt-0.5 size-4 shrink-0" />
								<p>{selectedEventDescription}</p>
							</div>
						{/if}

						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label>Gudang Asal</Label>
								<div
									class="flex h-10 w-full items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground"
								>
									{#if showFromWarehouse}
										{data.equipment.warehouse?.name || 'Pusat/Luar Sistem'}
									{:else}
										<span class="text-xs italic">(Penerimaan dari luar sistem)</span>
									{/if}
								</div>
							</div>

							{#if needsToWarehouse}
								<div class="space-y-2">
									<Label for="toWarehouseId">Gudang Tujuan</Label>
									<select
										id="toWarehouseId"
										name="toWarehouseId"
										bind:value={toWarehouseId}
										class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
										required
									>
										<option value="">-- Pilih Gudang Tujuan --</option>
										{#each data.warehouses as wh}
											<option value={wh.id}>{wh.name}</option>
										{/each}
									</select>
								</div>
							{:else}
								<div class="space-y-2 opacity-50">
									<Label>Gudang Tujuan</Label>
									<div
										class="flex h-10 w-full items-center rounded-md border border-dashed border-input px-3 text-sm text-muted-foreground italic"
									>
										Keluar dari sistem (Permanen)
									</div>
								</div>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="specificLocationName">Lokasi Spesifik / Unit Penanggung Jawab</Label>
							<div class="relative">
								<MapPin
									class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									id="specificLocationName"
									name="specificLocationName"
									placeholder="Contoh: Yonif 201, Kapal X, Truk A, dll"
									class="pl-10"
									bind:value={specificLocationName}
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="notes">Catatan Tambahan</Label>
							<div class="relative">
								<ClipboardList class="absolute top-3 left-3 size-4 text-muted-foreground" />
								<Textarea
									id="notes"
									name="notes"
									placeholder="Tambahkan keterangan mutasi jika diperlukan..."
									class="min-h-[100px] pl-10"
									bind:value={notes}
								/>
							</div>
						</div>

						<div class="flex justify-end gap-3">
							<Button variant="outline" type="button" onclick={handleBack} disabled={loading}>
								Batal
							</Button>
							<Button type="submit" class="gap-2" disabled={loading}>
								{#if loading}
									<div
										class="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"
									></div>
								{:else}
									<ArrowRightLeft class="size-4" />
								{/if}
								Catat Mutasi
							</Button>
						</div>
					</Card.Content>
				</form>
			</Card.Root>
		</div>
	</div>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Gagal'}
	description={notificationMsg}
	onAction={() => {
		notificationOpen = false;
		if (notificationType === 'success') {
			handleBack();
		}
	}}
/>

<Dialog.Root bind:open={guideOpen}>
	<Dialog.Content class="sm:max-w-3xl">
		<Dialog.Header>
			<Dialog.Title>Panduan Alur Mutasi Inventaris</Dialog.Title>
			<Dialog.Description>
				Penjelasan mengenai alur perpindahan barang di sistem Inventaris Puskomlekad.
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[65vh] space-y-6 overflow-y-auto py-4 pr-2">
			<section class="space-y-4">
				<h3 class="flex items-center gap-2 font-semibold text-primary">
					<Info class="size-4" />
					Jenis Kejadian
				</h3>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-blue-600 dark:text-blue-400">
							Penerimaan / Masuk (Eksternal)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Barang masuk dari sumber luar (pengadaan, hibah, dll). Gudang asal dikosongkan karena
							datang dari luar sistem. Alat otomatis siap digunakan (READY).
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-orange-600 dark:text-orange-400">
							Pengeluaran / Keluar (Permanen)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Barang keluar dari sistem secara permanen (lelang, penghapusan, atau rusak total).
							Gudang tujuan dikosongkan karena barang tidak lagi dalam pengawasan sistem.
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-purple-600 dark:text-purple-400">
							Transfer Keluar (Internal)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Mengirim barang antar gudang dalam organisasi. Alat akan berstatus TRANSIT (dalam
							perjalanan) dan tidak bisa dipinjam/digunakan sementara waktu.
						</p>
					</div>
					<div class="rounded-lg border p-3 shadow-sm">
						<p class="font-medium text-green-600 dark:text-green-400">
							Transfer Masuk (Internal)
						</p>
						<p class="mt-1 text-sm text-muted-foreground">
							Konfirmasi bahwa barang yang dikirim (Transfer Keluar) telah sampai di tujuan. Alat
							kembali berstatus READY di gudang yang baru.
						</p>
					</div>
				</div>
			</section>

			<section class="space-y-4 border-t pt-6">
				<h3 class="flex items-center gap-2 font-semibold text-primary">
					<Package class="size-4" />
					Klasifikasi
				</h3>
				<div class="grid gap-3 sm:grid-cols-3">
					<div class="rounded-md bg-muted p-3 text-sm">
						<p class="mb-1 font-semibold">Komunity</p>
						<p class="text-xs text-muted-foreground">
							Digunakan jika mutasi adalah serah terima ke satuan pemakai (siap pakai).
						</p>
					</div>
					<div class="rounded-md bg-muted p-3 text-sm">
						<p class="mb-1 font-semibold">Balkir</p>
						<p class="text-xs text-muted-foreground">
							Digunakan jika mutasi dalam rangka persiapan penghapusan atau ekspedisi.
						</p>
					</div>
					<div class="rounded-md bg-muted p-3 text-sm">
						<p class="mb-1 font-semibold">Transito</p>
						<p class="text-xs text-muted-foreground">
							Titipan sementara di gudang transit sebelum dikirim ke lokasi akhir.
						</p>
					</div>
				</div>
			</section>
		</div>

		<Dialog.Footer>
			<Button onclick={() => (guideOpen = false)}>Mengerti</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

