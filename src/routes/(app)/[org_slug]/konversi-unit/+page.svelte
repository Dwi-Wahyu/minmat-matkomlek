<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogTrigger
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';

	let { data } = $props(); // data dari server load

	// State UI
	let showDialog = $state(false);
	let isEditing = $state(false);
	let currentId = $state<string | null>(null);
	let errorMessage = $state('');

	// State form
	let formData = $state({
		itemId: '',
		fromUnit: '',
		toUnit: '',
		multiplier: 0
	});

	// Daftar unit (sesuai dengan baseUnit di item)
	const unitOptions = ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT'];

	// Reset form ke nilai awal
	function resetForm() {
		formData = { itemId: '', fromUnit: '', toUnit: '', multiplier: 0 };
		isEditing = false;
		currentId = null;
		errorMessage = '';
	}

	// Handler untuk edit
	function editItem(conv: (typeof data.conversions)[0]) {
		formData = {
			itemId: conv.itemId,
			fromUnit: conv.fromUnit,
			toUnit: conv.toUnit,
			multiplier: conv.multiplier
		};
		currentId = conv.id;
		isEditing = true;
		showDialog = true;
	}

	// Reset form ketika dialog ditutup
	$effect(() => {
		if (!showDialog) {
			resetForm();
		}
	});
</script>

<svelte:head>
	<title>Master Unit Konversi</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-4 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Unit Konversi</h1>
		<Dialog bind:open={showDialog}>
			<DialogTrigger asChild>
				<Button onclick={() => (showDialog = true)}>Tambah Baru</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? 'Edit' : 'Tambah'} Unit Konversi</DialogTitle>
					<DialogDescription>Isi detail konversi satuan untuk item tertentu.</DialogDescription>
				</DialogHeader>

				<!-- Pesan error -->
				{#if errorMessage}
					<div class="bg-destructive/15 text-destructive rounded-md p-3 text-sm">
						{errorMessage}
					</div>
				{/if}

				<form
					method="POST"
					action={isEditing ? '?/update' : '?/create'}
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								// Tampilkan pesan error dari server
								errorMessage = result.data?.message || 'Terjadi kesalahan';
							} else if (result.type === 'success') {
								// Sukses: refresh data, tutup dialog, reset form
								await invalidateAll();
								showDialog = false;
								resetForm();
							}
							// Jalankan update default (memperbarui form secara normal)
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={currentId ?? ''} />

					<div class="grid gap-4 py-4">
						<!-- Pilih Item -->
						<div class="grid gap-2">
							<label for="itemId" class="text-sm font-medium">Item</label>
							<select
								id="itemId"
								name="itemId"
								bind:value={formData.itemId}
								required
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							>
								<option value="" disabled>Pilih item</option>
								{#each data.items as item}
									<option value={item.id}>{item.name}</option>
								{/each}
							</select>
						</div>

						<!-- From Unit -->
						<div class="grid gap-2">
							<label for="fromUnit" class="text-sm font-medium">Dari Unit</label>
							<select
								id="fromUnit"
								name="fromUnit"
								bind:value={formData.fromUnit}
								required
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<option value="" disabled>Pilih unit</option>
								{#each unitOptions as unit}
									<option value={unit}>{unit}</option>
								{/each}
							</select>
						</div>

						<!-- To Unit -->
						<div class="grid gap-2">
							<label for="toUnit" class="text-sm font-medium">Ke Unit</label>
							<select
								id="toUnit"
								name="toUnit"
								bind:value={formData.toUnit}
								required
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							>
								<option value="" disabled>Pilih unit</option>
								{#each unitOptions as unit}
									<option value={unit}>{unit}</option>
								{/each}
							</select>
						</div>

						<!-- Multiplier -->
						<div class="grid gap-2">
							<label for="multiplier" class="text-sm font-medium">Pengali</label>
							<Input
								id="multiplier"
								name="multiplier"
								type="number"
								min="1"
								step="1"
								bind:value={formData.multiplier}
								required
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onclick={() => (showDialog = false)}>
							Batal
						</Button>
						<Button type="submit">Simpan</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	</div>

	<!-- Tabel Data -->
	<Table>
		<TableHeader>
			<TableRow>
				<TableHead>Item</TableHead>
				<TableHead>Dari Unit</TableHead>
				<TableHead>Ke Unit</TableHead>
				<TableHead>Pengali</TableHead>
				<TableHead>Aksi</TableHead>
			</TableRow>
		</TableHeader>
		<TableBody>
			{#each data.conversions as conv}
				<TableRow>
					<TableCell>{conv.item?.name ?? conv.itemId}</TableCell>
					<TableCell>{conv.fromUnit}</TableCell>
					<TableCell>{conv.toUnit}</TableCell>
					<TableCell>{conv.multiplier}</TableCell>
					<TableCell>
						<div class="flex gap-2">
							<Button size="sm" variant="outline" onclick={() => editItem(conv)}>Edit</Button>
							<form
								method="POST"
								action="?/delete"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											await invalidateAll();
										} else if (result.type === 'failure') {
											alert(result.data?.message || 'Gagal menghapus');
										}
										await update();
									};
								}}
							>
								<input type="hidden" name="id" value={conv.id} />
								<Button size="sm" variant="destructive" type="submit">Hapus</Button>
							</form>
						</div>
					</TableCell>
				</TableRow>
			{:else}
				<TableRow>
					<TableCell colspan="5" class="text-center">Belum ada data konversi</TableCell>
				</TableRow>
			{/each}
		</TableBody>
	</Table>
</div>
