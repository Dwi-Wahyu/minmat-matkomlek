<script lang="ts">
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';

	let { data } = $props();

	let formData = $state({ ...data.maintenance });

	const maintenanceTypes = ['PERAWATAN', 'PERBAIKAN'];
	const statusOptions = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
</script>

<svelte:head>
	<title>Edit Pemeliharaan</title>
</svelte:head>

<div class="container mx-auto max-w-2xl py-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Edit Pemeliharaan</h1>
		<Button variant="outline" href="/maintenance">Kembali</Button>
	</div>

	<form method="POST" use:enhance class="space-y-4">
		<!-- Equipment -->
		<div class="space-y-2">
			<Label for="equipmentId">Alat</Label>
			<select
				id="equipmentId"
				name="equipmentId"
				bind:value={formData.equipmentId}
				required
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
			>
				<option value="" disabled>Pilih alat</option>
				{#each data.equipment as eq}
					<option value={eq.id}>
						{eq.name}
						{eq.serialNumber ? `(${eq.serialNumber})` : ''}
					</option>
				{/each}
			</select>
		</div>

		<!-- Tipe -->
		<div class="space-y-2">
			<Label for="maintenanceType">Tipe Pemeliharaan</Label>
			<select
				id="maintenanceType"
				name="maintenanceType"
				bind:value={formData.maintenanceType}
				required
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
			>
				{#each maintenanceTypes as type}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</div>

		<!-- Deskripsi -->
		<div class="space-y-2">
			<Label for="description">Deskripsi</Label>
			<Textarea
				id="description"
				name="description"
				bind:value={formData.description}
				required
				rows={4}
			/>
		</div>

		<!-- Tanggal Jadwal -->
		<div class="space-y-2">
			<Label for="scheduledDate">Tanggal Jadwal</Label>
			<Input
				id="scheduledDate"
				name="scheduledDate"
				type="datetime-local"
				bind:value={formData.scheduledDate}
				required
			/>
		</div>

		<!-- Status -->
		<div class="space-y-2">
			<Label for="status">Status</Label>
			<select
				id="status"
				name="status"
				bind:value={formData.status}
				required
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
			>
				{#each statusOptions as status}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>

		<!-- Tanggal Selesai -->
		<div class="space-y-2">
			<Label for="completionDate">Tanggal Selesai (opsional)</Label>
			<Input
				id="completionDate"
				name="completionDate"
				type="datetime-local"
				bind:value={formData.completionDate}
			/>
		</div>

		<!-- Teknisi -->
		<div class="space-y-2">
			<Label for="technicianId">Teknisi (opsional)</Label>
			<select
				id="technicianId"
				name="technicianId"
				bind:value={formData.technicianId}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
			>
				<option value="">Pilih teknisi</option>
				{#each data.technicians as tech}
					<option value={tech.id}>{tech.name}</option>
				{/each}
			</select>
		</div>

		<div class="flex justify-end gap-2">
			<Button variant="outline" href="/pemeliharaan">Batal</Button>
			<Button type="submit">Update</Button>
		</div>
	</form>
</div>
