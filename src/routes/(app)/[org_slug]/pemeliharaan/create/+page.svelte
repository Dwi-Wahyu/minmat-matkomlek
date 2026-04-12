<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { ArrowLeft, Save, Activity, Clock, User as UserIcon, Calendar, Box, X } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as SearchableSelect from '$lib/components/ui/searchable-select';
	import { Badge } from '$lib/components/ui/badge';

	let { data } = $props();

	// State form
	let formData = $state({
		equipmentIds: [] as string[],
		maintenanceType: 'PERAWATAN',
		description: '',
		scheduledDate: '',
		completionDate: '',
		status: 'PENDING',
		technicianId: ''
	});

	// Helper untuk mendapatkan label alat yang dipilih
	function getEquipmentLabel(id: string) {
		const eq = data.equipment.find((e: any) => e.id === id);
		if (!eq) return id;
		return `${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`;
	}

	function removeEquipment(id: string) {
		formData.equipmentIds = formData.equipmentIds.filter((itemId) => itemId !== id);
	}

	// State untuk dialog notifikasi
	let showNotification = $state(false);
	let notificationType: 'success' | 'error' | 'info' = $state('success');
	let notificationTitle = $state('');
	let notificationDescription = $state('');
	let notificationActionLabel = $state('OK');

	const maintenanceTypes = ['PERAWATAN', 'PERBAIKAN'];
	const statusOptions = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

	// Handler untuk menampilkan notifikasi
	function showSuccessNotification() {
		notificationType = 'success';
		notificationTitle = 'Berhasil!';
		notificationDescription = 'Data pemeliharaan berhasil disimpan.';
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
			goto(`/${data.org_slug}/pemeliharaan`);
		}
	}
</script>

<svelte:head>
	<title>Tambah Pemeliharaan | MINMAT</title>
</svelte:head>

<div class="mx-auto max-w-4xl space-y-8 p-8">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button
				variant="outline"
				size="icon"
				href="/{data.org_slug}/pemeliharaan"
				class="rounded-full shadow-sm"
			>
				<ArrowLeft size={18} />
			</Button>
			<div>
				<h1 class="flex items-center gap-2 text-2xl font-bold text-slate-900">
					Tambah Pemeliharaan Baru
				</h1>
				<p class="text-sm text-slate-500">Buat jadwal perawatan atau perbaikan peralatan baru</p>
			</div>
		</div>
	</div>

	<Card.Root class="overflow-hidden border-slate-200 shadow-sm">
		<Card.Header class="border-b border-slate-100 bg-slate-50/50">
			<Card.Title
				class="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-500 uppercase"
			>
				Formulir Pemeliharaan
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				method="POST"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (
							result.type === 'success' ||
							(result.type === 'redirect' && result.location.includes('pemeliharaan'))
						) {
							showSuccessNotification();
						} else if (result.type === 'failure') {
							showErrorNotification(result.data?.message || 'Terjadi kesalahan');
						}
						await update();
					};
				}}
				class="space-y-6"
			>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<!-- Equipment -->
					<div class="space-y-2 md:col-span-2">
						<Label for="equipmentId" class="text-xs font-bold text-slate-500 uppercase"
							>Peralatan (Bisa pilih lebih dari satu)</Label
						>

						<!-- Hidden Inputs for form submission -->
						{#each formData.equipmentIds as id (id)}
							<input type="hidden" name="equipmentId" value={id} />
						{/each}

						<SearchableSelect.Root
							type="multiple"
							bind:value={formData.equipmentIds}
						>
							<SearchableSelect.Trigger
								class="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
							>
								{#if formData.equipmentIds.length === 0}
									<span class="text-slate-400">Pilih alat...</span>
								{:else}
									<span class="text-slate-900">{formData.equipmentIds.length} alat dipilih</span>
								{/if}
							</SearchableSelect.Trigger>
							<SearchableSelect.Content>
								{#each data.equipment as eq (eq.id)}
									<SearchableSelect.Item
										value={eq.id}
										label={`${eq.item?.name || 'Tanpa Nama'} ${eq.serialNumber ? `(${eq.serialNumber})` : ''}`}
									>
										<div class="flex flex-col">
											<span class="font-medium">{eq.item?.name || 'Tanpa Nama'}</span>
											{#if eq.serialNumber}
												<span class="text-[10px] text-slate-400">SN: {eq.serialNumber}</span>
											{/if}
										</div>
									</SearchableSelect.Item>
								{/each}
							</SearchableSelect.Content>
						</SearchableSelect.Root>

						<!-- List of Selected Badges -->
						{#if formData.equipmentIds.length > 0}
							<div class="mt-3 flex flex-wrap gap-2">
								{#each formData.equipmentIds as id (id)}
									<Badge
										variant="secondary"
										class="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200"
									>
										<Box size={12} class="text-slate-400" />
										{getEquipmentLabel(id)}
										<button
											type="button"
											onclick={() => removeEquipment(id)}
											class="ml-1 text-slate-400 hover:text-slate-900"
										>
											<X size={14} />
										</button>
									</Badge>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType" class="text-xs font-bold text-slate-500 uppercase"
							>Tipe Pemeliharaan</Label
						>
						<select
							id="maintenanceType"
							name="maintenanceType"
							bind:value={formData.maintenanceType}
							required
							class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
						>
							{#each maintenanceTypes as type (type)}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>

					<!-- Tanggal Jadwal -->
					<div class="space-y-2">
						<Label
							for="scheduledDate"
							class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"
						>
							<Calendar size={14} /> Tanggal Jadwal
						</Label>
						<Input
							id="scheduledDate"
							name="scheduledDate"
							type="datetime-local"
							bind:value={formData.scheduledDate}
							required
							class="h-11 rounded-xl border-slate-200"
						/>
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label
							for="status"
							class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"
						>
							<Activity size={14} /> Status
						</Label>
						<select
							id="status"
							name="status"
							bind:value={formData.status}
							required
							class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
						>
							{#each statusOptions as status (status)}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label
							for="completionDate"
							class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"
						>
							<Clock size={14} /> Tanggal Selesai (Opsional)
						</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={formData.completionDate}
							class="h-11 rounded-xl border-slate-200"
						/>
					</div>

					<!-- Teknisi -->
					<div class="space-y-2">
						<Label
							for="technicianId"
							class="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase"
						>
							<UserIcon size={14} /> Teknisi (Opsional)
						</Label>
						<select
							id="technicianId"
							name="technicianId"
							bind:value={formData.technicianId}
							class="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-all outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
						>
							<option value="">Pilih teknisi</option>
							{#each data.technicians as tech (tech.id)}
								<option value={tech.id}>{tech.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description" class="text-xs font-bold text-slate-500 uppercase"
						>Deskripsi Pekerjaan</Label
					>
					<Textarea
						id="description"
						name="description"
						bind:value={formData.description}
						required
						rows={4}
						class="resize-none rounded-xl border-slate-200"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
				</div>

				<div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
					<Button
						variant="outline"
						href="/{data.org_slug}/pemeliharaan"
						class="h-11 rounded-xl px-6">Batal</Button
					>
					<Button
						type="submit"
						class="h-11 gap-2 rounded-xl bg-slate-900 px-8 text-white shadow-sm hover:bg-slate-800"
					>
						<Save size={18} />
						Simpan Data
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

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
