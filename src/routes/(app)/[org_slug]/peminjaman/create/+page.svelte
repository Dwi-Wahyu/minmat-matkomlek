<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { page } from '$app/state';
	import Badge from '@/components/ui/badge/badge.svelte';

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

	// Inisialisasi selectedItems dan pre-select alat
	$effect(() => {
		if (data.equipment.length > 0) {
			const initial: Record<string, { selected: boolean; qty: number }> = {};
			data.equipment.forEach((eq) => {
				// Cek apakah alat ini adalah yang dipilih sebelumnya dari URL
				const isPreselected = eq.id === data.preselectedEquipmentId;
				initial[eq.id] = { selected: isPreselected, qty: 1 };
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

	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/peminjaman`;
		}
	}
</script>

<svelte:head>
	<title>Ajukan Peminjaman | {data.targetOrg.name}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-6">
	<div class="mb-6 flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold tracking-tight">Ajukan Peminjaman</h1>
			<Button variant="outline" href={`/${page.params.org_slug}/peminjaman`}>Kembali</Button>
		</div>
		<p class="text-muted-foreground">
			Meminjam material dari satuan: <span class="font-bold text-foreground"
				>{data.targetOrg.name}</span
			>
		</p>
	</div>

	<form
		method="POST"
		use:enhance={() => {
			return async ({ result }) => {
				if (result.type === 'success') {
					notificationType = 'success';
					notificationTitle = 'Berhasil!';
					notificationDescription = result.data?.message || 'Pengajuan peminjaman telah dikirim.';
					showNotification = true;
				} else if (result.type === 'failure') {
					notificationType = 'error';
					notificationTitle = 'Gagal!';
					notificationDescription =
						result.data?.message || 'Terjadi kesalahan saat memproses data.';
					showNotification = true;
				}
			};
		}}
		class="space-y-6"
	>
		<!-- Target Organization ID (Hidden) -->
		<input type="hidden" name="targetOrgId" value={data.targetOrg.id} />

		<!-- Informasi Peminjaman -->
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<h2 class="mb-4 border-b pb-2 text-lg font-semibold">Informasi Operasional</h2>
			<div class="grid gap-6 md:grid-cols-2">
				<div class="space-y-2">
					<Label for="unit">Unit/Satuan Peminjam</Label>
					<Input
						id="unit"
						name="unit"
						bind:value={unit}
						placeholder="Contoh: Yonif 201, Hubdam, dll."
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="purpose">Tujuan Penggunaan</Label>
					<select
						id="purpose"
						name="purpose"
						bind:value={purpose}
						required
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none"
					>
						<option value="OPERASI">Operasi</option>
						<option value="LATIHAN">Latihan</option>
					</select>
				</div>

				<div class="space-y-2">
					<Label for="startDate">Rencana Tanggal Mulai</Label>
					<Input
						id="startDate"
						name="startDate"
						type="datetime-local"
						bind:value={startDate}
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="endDate">Rencana Tanggal Selesai</Label>
					<Input id="endDate" name="endDate" type="datetime-local" bind:value={endDate} />
				</div>
			</div>
		</div>

		<!-- Pemilihan Equipment -->
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="mb-4 flex items-center justify-between border-b pb-2">
				<h2 class="text-lg font-semibold">Daftar Alat yang Dipinjam</h2>
				<Badge variant="secondary" class="px-3 py-1">
					{selectedCount} Alat Terpilih
				</Badge>
			</div>

			{#if data.equipment.length === 0}
				<div class="rounded-lg border-2 border-dashed bg-muted/50 p-10 text-center">
					<p class="text-muted-foreground italic">Tidak ada alat berstatus READY di satuan ini.</p>
				</div>
			{:else}
				<div class="grid gap-3">
					{#each data.equipment as eq (eq.id)}
						<div
							class="flex items-center gap-4 rounded-lg border p-4 transition-colors {selectedItems[
								eq.id
							]?.selected
								? 'border-blue-200 bg-blue-50/50'
								: 'hover:bg-muted/30'}"
						>
							<Checkbox
								id={eq.id}
								checked={selectedItems[eq.id]?.selected || false}
								onCheckedChange={() => toggleItem(eq.id)}
							/>

							<div class="flex-1">
								<Label for={eq.id} class="block cursor-pointer font-bold">
									{eq.item.name}
								</Label>
								<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
									{#if eq.serialNumber}
										<span class="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono"
											>SN: {eq.serialNumber}</span
										>
									{/if}
									{#if eq.brand}
										<span>Merek: <span class="font-medium text-foreground">{eq.brand}</span></span>
									{/if}
									<span
										>Gudang: <span class="font-medium text-foreground"
											>{eq.warehouse?.name || '-'}</span
										></span
									>
								</div>
							</div>

							{#if selectedItems[eq.id]?.selected}
								<div class="flex flex-col items-end gap-1">
									<Label class="text-[10px] font-bold text-muted-foreground uppercase">Jumlah</Label
									>
									<div class="w-20">
										<Input
											type="number"
											min="1"
											value={selectedItems[eq.id]?.qty || 1}
											oninput={(e) => updateQty(eq.id, parseInt(e.currentTarget.value))}
											class="h-8 text-center"
										/>
										<input type="hidden" name="equipmentId[]" value={eq.id} />
										<input type="hidden" name="qty[]" value={selectedItems[eq.id]?.qty || 1} />
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex justify-end gap-3 border-t pt-4">
			<Button variant="ghost" href={`/${page.params.org_slug}/peminjaman`}>Batal</Button>
			<Button type="submit" size="lg" class="px-10" disabled={selectedCount === 0}>
				Kirim Pengajuan Peminjaman
			</Button>
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
