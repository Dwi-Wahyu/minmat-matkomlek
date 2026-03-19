<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	// State form
	let unit = $state(data.lending.unit);
	let purpose = $state(data.lending.purpose);
	let startDate = $state(data.lending.startDate);
	let endDate = $state(data.lending.endDate);

	// State untuk items yang dipilih
	let selectedItems = $state<Record<string, { selected: boolean; qty: number }>>({});

	// State untuk notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State untuk loading
	let isSubmitting = $state(false);

	// Inisialisasi selectedItems dari data yang ada
	$effect(() => {
		if (data.equipment.length > 0) {
			const initial: Record<string, { selected: boolean; qty: number }> = {};
			data.equipment.forEach((eq) => {
				initial[eq.id] = {
					selected: eq.isSelected || false,
					qty: eq.selectedQty || 1
				};
			});
			selectedItems = initial;
		}
	});

	// Hitung jumlah item yang dipilih
	const selectedCount = $derived(
		Object.values(selectedItems).filter((item) => item.selected).length
	);

	// Hitung total quantity
	const totalQuantity = $derived(
		Object.values(selectedItems)
			.filter((item) => item.selected)
			.reduce((sum, item) => sum + item.qty, 0)
	);

	// Handler untuk checkbox
	function toggleItem(id: string) {
		selectedItems[id] = {
			...selectedItems[id],
			selected: !selectedItems[id]?.selected
		};
		selectedItems = { ...selectedItems };
	}

	// Handler untuk quantity
	function updateQty(id: string, qty: number) {
		selectedItems[id] = {
			...selectedItems[id],
			qty: Math.max(1, qty)
		};
		selectedItems = { ...selectedItems };
	}

	// Handler untuk select all
	function selectAll() {
		const newSelected: Record<string, { selected: boolean; qty: number }> = {};
		Object.keys(selectedItems).forEach((id) => {
			newSelected[id] = {
				...selectedItems[id],
				selected: true
			};
		});
		selectedItems = newSelected;
	}

	// Handler untuk deselect all
	function deselectAll() {
		const newSelected: Record<string, { selected: boolean; qty: number }> = {};
		Object.keys(selectedItems).forEach((id) => {
			newSelected[id] = {
				...selectedItems[id],
				selected: false
			};
		});
		selectedItems = newSelected;
	}

	// Handler untuk notifikasi error
	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal!';
		notificationDescription = message;
		notificationActionLabel = 'OK';
		showNotification = true;
	}

	function handleNotificationAction() {
		showNotification = false;
	}

	// Validasi form sebelum submit
	function validateForm() {
		if (!unit.trim()) {
			showErrorNotification('Unit/Divisi harus diisi');
			return false;
		}
		if (!startDate) {
			showErrorNotification('Tanggal mulai harus diisi');
			return false;
		}
		if (selectedCount === 0) {
			showErrorNotification('Minimal 1 alat harus dipilih');
			return false;
		}
		return true;
	}
</script>

<svelte:head>
	<title>Edit Peminjaman</title>
</svelte:head>

<div class="container mx-auto max-w-6xl py-6">
	<!-- Header dengan breadcrumb -->
	<div class="mb-4">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<a href={`/${data.orgSlug}/peminjaman`} class="hover:underline">Peminjaman</a>
			<span>/</span>
			<a href={`/${data.orgSlug}/peminjaman/${data.lending.id}`} class="hover:underline">Detail</a>
			<span>/</span>
			<span>Edit</span>
		</div>
	</div>

	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Edit Peminjaman</h1>
			<p class="text-sm text-muted-foreground">
				ID: <span class="font-mono">{data.lending.id}</span>
			</p>
		</div>
		<Button variant="outline" href={`/${data.orgSlug}/peminjaman/${data.lending.id}`}>Batal</Button>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			return async ({ result, update }) => {
				isSubmitting = true;
				if (result.type === 'failure') {
					showErrorNotification(result.data?.message || 'Terjadi kesalahan');
				}
				isSubmitting = false;
				await update();
			};
		}}
		onsubmit={(e) => {
			if (!validateForm()) {
				e.preventDefault();
			}
		}}
	>
		<div class="grid gap-6 lg:grid-cols-3">
			<!-- Kolom Kiri: Form Utama -->
			<div class="lg:col-span-2">
				<!-- Informasi Peminjaman -->
				<Card class="mb-6">
					<CardHeader>
						<CardTitle>Informasi Peminjaman</CardTitle>
						<CardDescription>Ubah data peminjaman sesuai kebutuhan</CardDescription>
					</CardHeader>
					<CardContent>
						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="unit" class="required">Unit/Divisi</Label>
								<Input
									id="unit"
									name="unit"
									bind:value={unit}
									placeholder="Contoh: Satuan Komunikasi"
									required
								/>
							</div>

							<div class="space-y-2">
								<Label for="purpose" class="required">Tujuan</Label>
								<select
									id="purpose"
									name="purpose"
									bind:value={purpose}
									required
									class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
								>
									<option value="OPERASI">Operasi</option>
									<option value="LATIHAN">Latihan</option>
								</select>
							</div>

							<div class="space-y-2">
								<Label for="startDate" class="required">Tanggal Mulai</Label>
								<Input
									id="startDate"
									name="startDate"
									type="datetime-local"
									bind:value={startDate}
									required
								/>
							</div>

							<div class="space-y-2">
								<Label for="endDate">Tanggal Selesai (opsional)</Label>
								<Input
									id="endDate"
									name="endDate"
									type="datetime-local"
									bind:value={endDate}
									min={startDate}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Pemilihan Equipment -->
				<Card>
					<CardHeader>
						<div class="flex items-center justify-between">
							<div>
								<CardTitle>Pilih Alat</CardTitle>
								<CardDescription>
									Pilih alat yang akan dipinjam (tersedia: {data.equipment.length} alat)
								</CardDescription>
							</div>
							<div class="flex gap-2">
								<Button type="button" variant="outline" size="sm" onclick={selectAll}>
									Pilih Semua
								</Button>
								<Button type="button" variant="outline" size="sm" onclick={deselectAll}>
									Hapus Semua
								</Button>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{#if data.equipment.length === 0}
							<div class="rounded-lg bg-muted p-8 text-center">
								<p class="text-muted-foreground">Tidak ada alat yang tersedia untuk dipinjam</p>
							</div>
						{:else}
							<div class="space-y-2">
								{#each data.equipment as eq}
									<div class="flex items-center gap-4 rounded-lg border p-3 hover:bg-muted/50">
										<Checkbox
											id={eq.id}
											checked={selectedItems[eq.id]?.selected || false}
											onclick={() => toggleItem(eq.id)}
										/>

										<div class="flex-1">
											<div class="flex items-center gap-2">
												<Label for={eq.id} class="cursor-pointer font-medium">
													{eq.name}
												</Label>
												<Badge variant="outline" class="text-xs">
													{eq.type}
												</Badge>
												{#if eq.condition}
													<Badge
														class={eq.condition === 'BAIK'
															? 'bg-green-100 text-green-800'
															: eq.condition === 'RUSAK_RINGAN'
																? 'bg-yellow-100 text-yellow-800'
																: 'bg-red-100 text-red-800'}
													>
														{eq.condition.replace('_', ' ')}
													</Badge>
												{/if}
											</div>
											<div class="mt-1 flex gap-3 text-xs text-muted-foreground">
												{#if eq.serialNumber}
													<span class="font-mono">SN: {eq.serialNumber}</span>
												{/if}
												{#if eq.brand}
													<span>Merk: {eq.brand}</span>
												{/if}
												{#if eq.item?.name}
													<span>Kategori: {eq.item.name}</span>
												{/if}
												{#if eq.warehouse?.name}
													<span>Lokasi: {eq.warehouse.name}</span>
												{/if}
											</div>
										</div>

										{#if selectedItems[eq.id]?.selected}
											<div class="w-24">
												<Input
													type="number"
													min="1"
													max="999"
													value={selectedItems[eq.id]?.qty || 1}
													oninput={(e) => updateQty(eq.id, parseInt(e.currentTarget.value))}
													class="text-center"
												/>
											</div>
										{/if}

										<!-- Hidden inputs untuk form submission -->
										{#if selectedItems[eq.id]?.selected}
											<input type="hidden" name="equipmentId[]" value={eq.id} />
											<input type="hidden" name="qty[]" value={selectedItems[eq.id]?.qty || 1} />
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>

			<!-- Kolom Kanan: Ringkasan -->
			<div class="lg:col-span-1">
				<Card class="sticky top-4">
					<CardHeader>
						<CardTitle>Ringkasan</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<!-- Status -->
						<div class="rounded-lg bg-muted p-3">
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Status</span>
								<Badge class="bg-gray-100 text-gray-800">Draft</Badge>
							</div>
						</div>

						<!-- Jumlah Item -->
						<div>
							<div class="flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Item dipilih</span>
								<span class="font-medium">{selectedCount}</span>
							</div>
							<div class="mt-1 flex items-center justify-between">
								<span class="text-sm text-muted-foreground">Total quantity</span>
								<span class="font-medium">{totalQuantity}</span>
							</div>
						</div>

						<!-- Divider -->
						<hr class="my-2" />

						<!-- Informasi Organisasi -->
						<div>
							<h4 class="mb-2 text-sm font-medium">Organisasi</h4>
							<p class="text-sm text-muted-foreground">{data.lending.organization?.name}</p>
						</div>

						<!-- Informasi Pemohon -->
						<div>
							<h4 class="mb-2 text-sm font-medium">Pemohon</h4>
							<p class="text-sm text-muted-foreground">{data.lending.requestedByUser?.name}</p>
						</div>

						<!-- Tombol Submit -->
						<div class="space-y-2 pt-4">
							<Button type="submit" class="w-full" disabled={selectedCount === 0 || isSubmitting}>
								{#if isSubmitting}
									<span class="flex items-center gap-2">
										<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
												fill="none"
											/>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											/>
										</svg>
										Menyimpan...
									</span>
								{:else}
									Simpan Perubahan
								{/if}
							</Button>

							<Button
								type="button"
								variant="outline"
								class="w-full"
								href={`/${data.orgSlug}/peminjaman/${data.lending.id}`}
							>
								Batal
							</Button>
						</div>

						<!-- Info tambahan -->
						<p class="text-xs text-muted-foreground">
							<span class="text-red-500">*</span> Field wajib diisi
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	</form>

	<!-- Notification Dialog -->
	<NotificationDialog
		bind:open={showNotification}
		type={notificationType}
		title={notificationTitle}
		description={notificationDescription}
		actionLabel={notificationActionLabel}
		onAction={handleNotificationAction}
	/>
</div>
