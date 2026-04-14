<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import {
		Wrench,
		ArrowLeft,
		Save,
		Info,
		Activity,
		Clock,
		User as UserIcon,
		Calendar
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	let { data } = $props();

	let formData = $state({ ...data.maintenance });

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
		notificationTitle = 'Berhasil Diperbarui!';
		notificationDescription = 'Perubahan data pemeliharaan berhasil disimpan.';
		notificationActionLabel = 'Selesai';
		showNotification = true;
	}

	function showErrorNotification(message: string) {
		notificationType = 'error';
		notificationTitle = 'Gagal Memperbarui!';
		notificationDescription = message || 'Terjadi kesalahan saat menyimpan perubahan.';
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
	<title>Edit Pemeliharaan | MINMAT</title>
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
				<h1 class="flex items-center gap-2 text-2xl font-bold text-foreground">
					<Wrench size={24} class="text-muted-foreground" />
					Edit Pemeliharaan
				</h1>
				<p class="text-sm text-muted-foreground">Perbarui detail jadwal pemeliharaan peralatan</p>
			</div>
		</div>
	</div>

	<Card.Root class="overflow-hidden border-border shadow-sm">
		<Card.Header class="border-b border-border bg-muted/50">
			<Card.Title
				class="flex items-center gap-2 text-sm font-bold tracking-wider text-muted-foreground uppercase"
			>
				<Info size={16} />
				Informasi Pemeliharaan
			</Card.Title>
		</Card.Header>
		<Card.Content class="p-6">
			<form 
				method="POST" 
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success' || (result.type === 'redirect' && result.location.includes('pemeliharaan'))) {
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
					<div class="space-y-2">
						<Label for="equipmentId" class="text-xs font-bold text-muted-foreground uppercase"
							>Peralatan</Label
						>
						<div class="relative">
							<select
								id="equipmentId"
								name="equipmentId"
								bind:value={formData.equipmentId}
								required
								class="flex h-11 w-full appearance-none rounded-xl border border-border bg-card px-3 py-2 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-ring"
							>
								<option value="" disabled>Pilih alat</option>
								{#each data.equipment as eq}
									<option value={eq.id}>
										{eq.item?.name || 'Tanpa Nama'}
										{eq.serialNumber ? `(${eq.serialNumber})` : ''}
									</option>
								{/each}
							</select>
						</div>
					</div>

					<!-- Tipe -->
					<div class="space-y-2">
						<Label for="maintenanceType" class="text-xs font-bold text-muted-foreground uppercase"
							>Tipe Pemeliharaan</Label
						>
						<select
							id="maintenanceType"
							name="maintenanceType"
							bind:value={formData.maintenanceType}
							required
							class="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-ring"
						>
							{#each maintenanceTypes as type}
								<option value={type}>{type}</option>
							{/each}
						</select>
					</div>

					<!-- Tanggal Jadwal -->
					<div class="space-y-2">
						<Label
							for="scheduledDate"
							class="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"
						>
							<Calendar size={14} /> Tanggal Jadwal
						</Label>
						<Input
							id="scheduledDate"
							name="scheduledDate"
							type="datetime-local"
							bind:value={formData.scheduledDate}
							required
							class="h-11 rounded-xl border-border"
						/>
					</div>

					<!-- Status -->
					<div class="space-y-2">
						<Label
							for="status"
							class="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"
						>
							<Activity size={14} /> Status
						</Label>
						<select
							id="status"
							name="status"
							bind:value={formData.status}
							required
							class="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-ring"
						>
							{#each statusOptions as status}
								<option value={status}>{status}</option>
							{/each}
						</select>
					</div>

					<!-- Tanggal Selesai -->
					<div class="space-y-2">
						<Label
							for="completionDate"
							class="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"
						>
							<Clock size={14} /> Tanggal Selesai (Opsional)
						</Label>
						<Input
							id="completionDate"
							name="completionDate"
							type="datetime-local"
							bind:value={formData.completionDate}
							class="h-11 rounded-xl border-border"
						/>
					</div>

					<!-- Teknisi -->
					<div class="space-y-2">
						<Label
							for="technicianId"
							class="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase"
						>
							<UserIcon size={14} /> Teknisi (Opsional)
						</Label>
						<select
							id="technicianId"
							name="technicianId"
							bind:value={formData.technicianId}
							class="flex h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm transition-all outline-none focus:border-primary focus:ring-2 focus:ring-ring"
						>
							<option value="">Pilih teknisi</option>
							{#each data.technicians as tech}
								<option value={tech.id}>{tech.name}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Deskripsi -->
				<div class="space-y-2">
					<Label for="description" class="text-xs font-bold text-muted-foreground uppercase"
						>Deskripsi Pekerjaan</Label
					>
					<Textarea
						id="description"
						name="description"
						bind:value={formData.description}
						required
						rows={4}
						class="resize-none rounded-xl border-border"
						placeholder="Jelaskan detail pemeliharaan..."
					/>
				</div>

				<div class="flex justify-end gap-3 border-t border-border pt-4">
					<Button
						variant="outline"
						href="/{data.org_slug}/pemeliharaan"
						class="h-11 rounded-xl px-6">Batal</Button
					>
					<Button
						type="submit"
						class="h-11 gap-2 rounded-xl bg-primary px-8 text-primary-foreground shadow-sm hover:bg-primary/90"
					>
						<Save size={18} />
						Simpan Perubahan
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
