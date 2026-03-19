<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	// State form
	let unit = $state('');
	let purpose = $state('OPERASI');
	let startDate = $state('');
	let endDate = $state('');

	// State untuk items yang dipilih
	let selectedItems = $state<Record<string, { selected: boolean; qty: number }>>({});

	// State untuk notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// Inisialisasi selectedItems
	$effect(() => {
		if (data.equipment.length > 0) {
			const initial: Record<string, { selected: boolean; qty: number }> = {};
			data.equipment.forEach((eq) => {
				initial[eq.id] = { selected: false, qty: 1 };
			});
			selectedItems = initial;
		}
	});

	// Hitung jumlah item yang dipilih
	const selectedCount = $derived(
		Object.values(selectedItems).filter((item) => item.selected).length
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
</script>

<svelte:head>
	<title>Ajukan Peminjaman</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Ajukan Peminjaman Baru</h1>
		<Button variant="outline" href={`/${data.user.organization.slug}/peminjaman`}>Kembali</Button>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					showErrorNotification(result.data?.message || 'Terjadi kesalahan');
				}
				await update();
			};
		}}
		class="space-y-6"
	>
		<!-- Informasi Peminjaman -->
		<div class="rounded-lg border p-4">
			<h2 class="mb-4 text-lg font-semibold">Informasi Peminjaman</h2>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="unit">Unit/Divisi</Label>
					<Input
						id="unit"
						name="unit"
						bind:value={unit}
						placeholder="Contoh: Satuan Komunikasi"
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="purpose">Tujuan</Label>
					<select
						id="purpose"
						name="purpose"
						bind:value={purpose}
						required
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
					>
						<option value="OPERASI">Operasi</option>
						<option value="LATIHAN">Latihan</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label for="startDate">Tanggal Mulai</Label>
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
					<Input id="endDate" name="endDate" type="datetime-local" bind:value={endDate} />
				</div>
			</div>
		</div>

		<!-- Pemilihan Equipment -->
		<div class="rounded-lg border p-4">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-semibold">Pilih Alat</h2>
				<p class="text-sm text-muted-foreground">
					{selectedCount} item dipilih
				</p>
			</div>

			{#if data.equipment.length === 0}
				<div class="rounded-lg bg-muted p-8 text-center">
					<p class="text-muted-foreground">Tidak ada alat yang tersedia untuk dipinjam</p>
				</div>
			{:else}
				<div class="grid gap-2">
					{#each data.equipment as eq}
						<div class="flex items-center gap-4 rounded-lg border p-3">
							<Checkbox
								id={eq.id}
								checked={selectedItems[eq.id]?.selected || false}
								onclick={() => toggleItem(eq.id)}
							/>

							<div class="flex-1">
								<Label for={eq.id} class="cursor-pointer font-medium">
									{eq.name}
								</Label>
								<div class="flex gap-2 text-sm text-muted-foreground">
									{#if eq.serialNumber}
										<span>SN: {eq.serialNumber}</span>
									{/if}
									{#if eq.brand}
										<span>Merk: {eq.brand}</span>
									{/if}
									<span>Kondisi: {eq.condition}</span>
								</div>
							</div>

							{#if selectedItems[eq.id]?.selected}
								<div class="w-24">
									<Input
										type="number"
										min="1"
										value={selectedItems[eq.id]?.qty || 1}
										oninput={(e) => updateQty(eq.id, parseInt(e.currentTarget.value))}
									/>
									<input type="hidden" name="equipmentId[]" value={eq.id} />
									<input type="hidden" name="qty[]" value={selectedItems[eq.id]?.qty || 1} />
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="outline" href={`/${data.orgSlug}/peminjaman`}>Batal</Button>
			<Button type="submit" disabled={selectedCount === 0}>Ajukan Peminjaman</Button>
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
