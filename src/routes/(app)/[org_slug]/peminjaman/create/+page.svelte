<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { FileText, Search, ChevronDown, ChevronUp, Check, Warehouse, Tags } from '@lucide/svelte';

	let { data } = $props();

	// State form
	let unit = $state('');
	let purpose = $state('OPERASI');
	let startDate = $state('');
	let endDate = $state('');
	let selectedTargetOrgId = $state(data.targetOrg?.id || '');

	// State untuk items yang dipilih
	let selectedItems = $state<
		Record<string, { selected: boolean; qty: number; manualIds: string[] }>
	>({});

	// State expand grup
	let expandedGroups = $state<Record<string, boolean>>({});

	// State untuk notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	// State pencarian alat
	let searchQuery = $state('');

	// Inisialisasi selectedItems dan pre-select alat
	$effect(() => {
		if (data.groupedEquipment.length > 0) {
			const initial: Record<string, { selected: boolean; qty: number; manualIds: string[] }> = {};
			data.groupedEquipment.forEach((group) => {
				// Cek apakah grup ini berisi alat yang dipilih sebelumnya dari URL
				const isPreselected = group.preselected;
				initial[group.id] = {
					selected: isPreselected,
					qty: isPreselected ? 1 : 0,
					manualIds: isPreselected ? [data.preselectedEquipmentId || ''] : []
				};
			});
			selectedItems = initial;
		} else {
			selectedItems = {};
		}
	});

	// Filter equipment berdasarkan pencarian
	const filteredEquipment = $derived(
		data.groupedEquipment.filter((group) => {
			const searchLower = searchQuery.toLowerCase();
			return (
				group.name.toLowerCase().includes(searchLower) ||
				(group.brand && group.brand.toLowerCase().includes(searchLower)) ||
				(group.warehouseName && group.warehouseName.toLowerCase().includes(searchLower))
			);
		})
	);

	// Hitung jumlah item yang dipilih
	const selectedCount = $derived(
		Object.values(selectedItems).reduce((acc, item) => acc + (item.selected ? item.qty : 0), 0)
	);

	// Handler untuk checkbox
	function toggleItem(id: string) {
		const isSelected = !selectedItems[id]?.selected;
		selectedItems[id] = {
			...selectedItems[id],
			selected: isSelected,
			qty: isSelected ? 1 : 0,
			manualIds: []
		};
		selectedItems = { ...selectedItems };
	}

	// Handler untuk quantity
	function updateQty(id: string, qty: number, max: number) {
		const val = Math.min(Math.max(1, qty), max);
		selectedItems[id] = {
			...selectedItems[id],
			qty: val,
			selected: val > 0,
			manualIds: []
		};
		selectedItems = { ...selectedItems };
	}

	function toggleManualUnit(groupId: string, equipmentId: string) {
		let currentManual = selectedItems[groupId]?.manualIds || [];

		if (currentManual.includes(equipmentId)) {
			currentManual = currentManual.filter((id) => id !== equipmentId);
		} else {
			currentManual = [...currentManual, equipmentId];
		}

		selectedItems[groupId] = {
			...selectedItems[groupId],
			manualIds: currentManual,
			qty: currentManual.length,
			selected: currentManual.length > 0
		};
		selectedItems = { ...selectedItems };
	}

	function toggleGroupExpand(id: string) {
		expandedGroups[id] = !expandedGroups[id];
		expandedGroups = { ...expandedGroups };
	}

	function getConditionColor(condition: string) {
		switch (condition) {
			case 'BAIK':
				return 'bg-success/10 text-success border-success/20';
			case 'RUSAK_RINGAN':
				return 'bg-primary/10 text-primary border-primary/20';
			case 'RUSAK_BERAT':
				return 'bg-destructive/10 text-destructive border-destructive/20';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	function handleNotificationAction() {
		showNotification = false;
		if (notificationType === 'success') {
			window.location.href = `/${page.params.org_slug}/peminjaman`;
		}
	}

	async function handleTargetOrgChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const orgId = target.value;
		if (orgId) {
			await goto(`?targetOrgId=${orgId}`, { keepFocus: true, noScroll: true });
		} else {
			await goto(`?`, { keepFocus: true, noScroll: true });
		}
	}
</script>

<svelte:head>
	<title>Ajukan Peminjaman | {data.targetOrg?.name || 'Pilih Satuan'}</title>
</svelte:head>

<div class="container mx-auto max-w-4xl py-6">
	<div class="mb-6 flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<h1 class="text-3xl font-bold tracking-tight">Ajukan Peminjaman</h1>
			<Button variant="outline" href={`/${page.params.org_slug}/peminjaman`}>Kembali</Button>
		</div>
		<p class="text-muted-foreground">Silakan pilih daftar alat yang ingin dipinjam.</p>
	</div>

	<!-- <div class="mb-6 rounded-lg border bg-card p-6 shadow-sm">
		<div class="space-y-2">
			<Label for="targetOrg">Pilih Satuan Tujuan Peminjaman</Label>
			<select
				id="targetOrg"
				bind:value={selectedTargetOrgId}
				onchange={handleTargetOrgChange}
				disabled={data.organizations.length === 1}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if data.organizations.length > 1}
					<option value="">-- Pilih Satuan --</option>
				{/if}
				{#each data.organizations as org (org.id)}
					<option value={org.id}>{org.name}</option>
				{/each}
			</select>
			<p class="text-xs text-muted-foreground italic">
				{#if data.organizations.length === 1}
					* Peminjaman dilakukan kepada Satuan Induk ({data.organizations[0].name}).
				{:else}
					* Pilih satuan jajaran tujuan peminjaman.
				{/if}
			</p>
		</div>
	</div> -->

	{#if data.targetOrg}
		<form
			method="POST"
			enctype="multipart/form-data"
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
							<option value="PERINTAH_LANGSUNG">Perintah Langsung</option>
						</select>
					</div>

					{#if purpose === 'PERINTAH_LANGSUNG'}
						<div class="col-span-2 space-y-2">
							<Label for="overrideReason" class="font-bold text-primary"
								>Keterangan Perintah Langsung (Wajib)</Label
							>
							<Input
								id="overrideReason"
								name="overrideReason"
								placeholder="Contoh: Operasi mendesak atas perintah pimpinan..."
								class="border-primary/20 focus-visible:ring-primary"
								required
							/>
						</div>
					{/if}

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

					<div class="col-span-2 space-y-2">
						<Label for="attachment" class="flex items-center gap-2">
							Dokumen Pendukung (Surat Perintah/Permohonan)
						</Label>
						<Input
							id="attachment"
							name="attachment"
							type="file"
							accept=".pdf,.docx"
							class="cursor-pointer"
						/>
						<p class="text-[10px] text-muted-foreground uppercase">
							Format yang diterima: .PDF, .DOCX (Maks 5MB)
						</p>
					</div>
				</div>
			</div>

			<!-- Pemilihan Equipment -->
			<div class="rounded-lg border bg-card p-6 shadow-sm">
				<div
					class="mb-4 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div>
						<h2 class="text-lg font-semibold">Daftar Alat</h2>
						<p class="text-xs text-muted-foreground">Pilih alat yang akan dipinjam</p>
					</div>
					<Badge variant="secondary" class="w-fit px-3 py-1">
						{selectedCount} Alat Terpilih
					</Badge>
				</div>

				{#if data.groupedEquipment.length === 0}
					<div class="rounded-lg border-2 border-dashed bg-muted/50 p-10 text-center">
						<p class="text-muted-foreground italic">
							Tidak ada alat berstatus READY di satuan ini.
						</p>
					</div>
				{:else}
					<div class="relative mb-4">
						<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="text"
							placeholder="Cari alat berdasarkan nama, brand, atau gudang..."
							bind:value={searchQuery}
							class="pl-10"
						/>
					</div>

					{#if filteredEquipment.length === 0}
						<div class="rounded-lg border bg-muted/30 p-8 text-center">
							<p class="text-sm text-muted-foreground">
								Tidak ada alat yang sesuai dengan pencarian "{searchQuery}"
							</p>
							<Button variant="link" size="sm" onclick={() => (searchQuery = '')}
								>Hapus Pencarian</Button
							>
						</div>
					{:else}
						<div class="grid gap-3">
							{#each filteredEquipment as group (group.id)}
								<div class="flex flex-col overflow-hidden rounded-lg border border-border">
									<div
										class="flex items-center gap-4 p-4 transition-colors {selectedItems[group.id]
											?.selected
											? 'border-primary/20 bg-primary/5'
											: 'hover:bg-muted/30'}"
									>
										<Checkbox
											id={group.id}
											checked={selectedItems[group.id]?.selected || false}
											onCheckedChange={() => toggleItem(group.id)}
										/>

										<div class="flex-1">
											<div class="flex items-center gap-2">
												<Label for={group.id} class="block cursor-pointer font-bold text-foreground">
													{group.name}
												</Label>
												<span class="text-xs font-bold text-primary"
													>{group.totalAvailable} Unit</span
												>
											</div>

											<div
												class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
											>
												{#if group.brand}
													<div class="flex items-center gap-1.5">
														<Tags class="h-3.5 w-3.5" />
														<span class="font-medium">{group.brand}</span>
													</div>
												{/if}
												<div class="flex items-center gap-1.5">
													<Warehouse class="h-3.5 w-3.5" />
													<span class="mt-0.5 font-medium">{group.warehouseName || '-'}</span>
												</div>
											</div>
										</div>

										<div class="flex items-center gap-2">
											{#if selectedItems[group.id]?.selected}
												<div class="flex flex-col items-end gap-1">
													<Label class="text-[10px] font-bold text-muted-foreground uppercase"
														>Jumlah Pinjam</Label
													>
													<div class="w-20">
														<Input
															type="number"
															min="1"
															max={group.totalAvailable}
															value={selectedItems[group.id]?.qty || 1}
															oninput={(e) =>
																updateQty(
																	group.id,
																	parseInt(e.currentTarget.value),
																	group.totalAvailable
																)}
															class="h-8 text-center"
															disabled={selectedItems[group.id]?.manualIds.length > 0}
														/>
													</div>
												</div>
											{/if}

											<Button
												variant="ghost"
												size="icon"
												class="size-8"
												onclick={() => toggleGroupExpand(group.id)}
											>
												{#if expandedGroups[group.id]}
													<ChevronUp class="size-4" />
												{:else}
													<ChevronDown class="size-4" />
												{/if}
											</Button>
										</div>
									</div>

									{#if expandedGroups[group.id]}
										<div class="border-t bg-muted/20 p-4">
											<p class="mb-3 text-xs font-semibold text-muted-foreground uppercase">
												Pilih Unit Spesifik
											</p>
											<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2">
												{#each group.equipments as eq}
													<button
														type="button"
														class="flex flex-col gap-2 rounded border bg-card p-3 text-left transition-colors hover:border-primary/50 {selectedItems[
															group.id
														]?.manualIds.includes(eq.id)
															? 'border-primary bg-primary/5 ring-1 ring-primary'
															: ''}"
														onclick={() => toggleManualUnit(group.id, eq.id)}
													>
														<div class="flex items-center justify-between">
															<span class="font-mono text-sm font-bold"
																>{eq.serialNumber || 'Tanpa SN'}</span
															>
															{#if selectedItems[group.id]?.manualIds.includes(eq.id)}
																<Check class="size-4 text-primary" />
															{/if}
														</div>
														<div class="flex flex-wrap gap-2">
															<Badge
																variant="outline"
																class="h-4 px-1 py-0 text-[10px] {getConditionColor(eq.condition)}"
															>
																{eq.condition}
															</Badge>
															<Badge
																variant="outline"
																class="h-4 border-primary/20 bg-primary/10 px-1 py-0 text-[10px] text-primary"
															>
																{eq.status}
															</Badge>
														</div>
													</button>
												{/each}
											</div>
											{#if selectedItems[group.id]?.manualIds.length > 0}
												<p class="mt-3 text-[10px] text-primary italic">
													* Mode pemilihan manual aktif. Jumlah dikunci sesuai unit yang dipilih.
												</p>
											{/if}
										</div>
									{/if}

									<!-- Hidden Fields for Form Submission -->
									{#if selectedItems[group.id]?.selected}
										{#if selectedItems[group.id]?.manualIds.length > 0}
											{#each selectedItems[group.id].manualIds as manualId}
												<input type="hidden" name="manualEquipmentId[]" value={manualId} />
											{/each}
										{:else}
											<input type="hidden" name="itemId[]" value={group.itemId} />
											<input type="hidden" name="warehouseId[]" value={group.warehouseId} />
											<input type="hidden" name="condition[]" value={group.condition} />
											<input type="hidden" name="qty[]" value={selectedItems[group.id]?.qty || 1} />
										{/if}
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>

			<div class="flex justify-end gap-3 border-t pt-4">
				<Button variant="ghost" href={`/${page.params.org_slug}/peminjaman`}>Batal</Button>
				<Button type="submit" size="lg" class="px-10" disabled={selectedCount === 0}>
					Kirim Pengajuan Peminjaman
				</Button>
			</div>
		</form>
	{:else}
		<div class="rounded-lg border-2 border-dashed bg-muted/50 p-20 text-center">
			<p class="text-xl font-medium text-muted-foreground">
				Silakan pilih satuan tujuan terlebih dahulu untuk melihat daftar alat.
			</p>
		</div>
	{/if}

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
