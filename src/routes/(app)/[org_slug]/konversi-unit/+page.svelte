<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { Plus, Pencil, Trash2, RefreshCcw, Search, Info } from '@lucide/svelte';

	let { data } = $props();

	// State UI Dialogs
	let showFormDialog = $state(false);
	let isEditing = $state(false);
	let currentId = $state<string | null>(null);
	let errorMessage = $state('');
	let formLoading = $state(false);

	// State Notification Dialog
	let notificationOpen = $state(false);
	let notificationMsg = $state('');
	let notificationTitle = $state('');
	let notificationType = $state<'success' | 'error' | 'info'>('success');

	// State Delete Confirmation
	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);
	let selectedId = $state('');

	// State form
	let formData = $state({
		itemId: '',
		fromUnit: '',
		toUnit: '',
		multiplier: 1
	});

	// Daftar unit
	const unitOptions = ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT'];

	function resetForm() {
		formData = { itemId: '', fromUnit: '', toUnit: '', multiplier: 1 };
		isEditing = false;
		currentId = null;
		errorMessage = '';
	}

	function editItem(conv: (typeof data.conversions)[0]) {
		formData = {
			itemId: conv.itemId,
			fromUnit: conv.fromUnit,
			toUnit: conv.toUnit,
			multiplier: parseFloat(conv.multiplier.toString())
		};
		currentId = conv.id;
		isEditing = true;
		showFormDialog = true;
	}

	function confirmDelete(id: string) {
		selectedId = id;
		deleteDialogOpen = true;
	}

	function handleNotification(title: string, msg: string, type: 'success' | 'error' | 'info' = 'success') {
		notificationTitle = title;
		notificationMsg = msg;
		notificationType = type;
		notificationOpen = true;
	}

	// Sinkronkan toUnit dengan baseUnit item terpilih
	$effect(() => {
		if (formData.itemId) {
			const selectedItem = data.items.find((i) => i.id === formData.itemId);
			if (selectedItem) {
				formData.toUnit = selectedItem.baseUnit;
			}
		}
	});

	$effect(() => {
		if (!showFormDialog) {
			if (!formLoading) resetForm();
		}
	});
</script>

<svelte:head>
	<title>Konversi Unit | MINMAT</title>
</svelte:head>

<div class="flex flex-col gap-6 p-6">
	<header class="flex flex-col justify-between gap-4 md:flex-row md:items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-foreground uppercase">Konversi Unit</h1>
			<p class="text-sm text-muted-foreground">
				Kelola perbandingan satuan untuk mempermudah perhitungan stok barang.
			</p>
		</div>
		<Button onclick={() => (showFormDialog = true)} class="gap-2 bg-emerald-700 hover:bg-emerald-800">
			<Plus class="size-4" />
			Tambah Konversi
		</Button>
	</header>

	<Card.Root class="overflow-hidden border-none shadow-md">
		<Card.Header class="bg-muted/30">
			<Card.Title>Daftar Konversi Satuan</Card.Title>
			<Card.Description>Daftar aturan konversi unit yang berlaku di sistem. Setiap konversi harus merujuk pada satuan dasar (Base Unit) barang.</Card.Description>
		</Card.Header>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row class="bg-muted/50">
							<Table.Head class="w-[50px] text-center">No</Table.Head>
							<Table.Head>Item</Table.Head>
							<Table.Head>Dari Satuan</Table.Head>
							<Table.Head class="text-center">Konversi</Table.Head>
							<Table.Head>Ke Satuan (Base)</Table.Head>
							<Table.Head class="text-right">Aksi</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.conversions as conv, i (conv.id)}
							<Table.Row class="transition-colors hover:bg-muted/30">
								<Table.Cell class="text-center font-medium text-muted-foreground">{i + 1}</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div class="rounded-md bg-blue-50 p-2 text-blue-600">
											<RefreshCcw class="size-4" />
										</div>
										<div class="flex flex-col">
											<span class="font-semibold text-foreground">{conv.item?.name ?? 'Item Tidak Dikenal'}</span>
											<span class="text-[10px] text-muted-foreground uppercase">Base: {conv.item?.baseUnit}</span>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									<span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
										1 {conv.fromUnit}
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									<span class="text-sm font-bold text-emerald-600">=</span>
								</Table.Cell>
								<Table.Cell>
									<span class="font-bold">{parseFloat(conv.multiplier.toString())}</span>
									<span class="text-xs text-muted-foreground ml-1">{conv.toUnit}</span>
								</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex justify-end gap-2">
										<Button variant="outline" size="icon" onclick={() => editItem(conv)} class="size-8">
											<Pencil class="size-4 text-blue-600" />
										</Button>
										<Button variant="outline" size="icon" onclick={() => confirmDelete(conv.id)} class="size-8">
											<Trash2 class="size-4 text-red-600" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-32 text-center">
									<div class="flex flex-col items-center justify-center text-muted-foreground">
										<Info size={40} class="mb-2 opacity-20" />
										<p>Belum ada data konversi unit.</p>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- Form Dialog -->
<Dialog bind:open={showFormDialog}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>{isEditing ? 'Edit' : 'Tambah'} Konversi Unit</DialogTitle>
			<DialogDescription>Atur perbandingan satuan untuk item terpilih. Satuan tujuan otomatis menggunakan satuan dasar (Base Unit) item.</DialogDescription>
		</DialogHeader>

		<form
			method="POST"
			action={isEditing ? '?/update' : '?/create'}
			use:enhance={() => {
				formLoading = true;
				errorMessage = '';
				return async ({ result, update }) => {
					formLoading = false;
					if (result.type === 'failure') {
						errorMessage = result.data?.message || 'Terjadi kesalahan input.';
					} else if (result.type === 'success') {
						await invalidateAll();
						showFormDialog = false;
						handleNotification(
							'Berhasil',
							isEditing ? 'Data konversi berhasil diperbarui.' : 'Data konversi baru telah ditambahkan.',
							'success'
						);
					}
					await update({ reset: false });
				};
			}}
			class="space-y-4 pt-4"
		>
			<input type="hidden" name="id" value={currentId ?? ''} />
			<input type="hidden" name="toUnit" value={formData.toUnit} />

			<div class="space-y-2">
				<Label for="itemId">Pilih Item</Label>
				<select
					id="itemId"
					name="itemId"
					bind:value={formData.itemId}
					required
					class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="" disabled>Pilih item...</option>
					{#each data.items as item}
						<option value={item.id}>{item.name} ({item.baseUnit})</option>
					{/each}
				</select>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="fromUnit">Dari Unit</Label>
					<select
						id="fromUnit"
						name="fromUnit"
						bind:value={formData.fromUnit}
						required
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="" disabled>Unit...</option>
						{#each unitOptions as unit}
							<option value={unit}>{unit}</option>
						{/each}
					</select>
				</div>
				<div class="space-y-2">
					<Label for="toUnit">Ke Unit (Base)</Label>
					<select
						id="toUnit"
						bind:value={formData.toUnit}
						disabled
						class="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<option value="" disabled>Unit...</option>
						{#each unitOptions as unit}
							<option value={unit}>{unit}</option>
						{/each}
					</select>
					<p class="text-[10px] text-muted-foreground italic">Otomatis dari Base Unit</p>
				</div>
			</div>

			<div class="space-y-2">
				<Label for="multiplier">Nilai Pengali (Multiplier)</Label>
				<div class="relative">
					<Input
						id="multiplier"
						name="multiplier"
						type="number"
						min="0.0001"
						step="any"
						bind:value={formData.multiplier}
						required
						class="pl-10"
					/>
					<div class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
						<RefreshCcw size={16} />
					</div>
				</div>
				<p class="text-[10px] text-muted-foreground italic">
					Contoh: 1 {formData.fromUnit || '...'} = {formData.multiplier} {formData.toUnit || '...'}
				</p>
			</div>

			{#if errorMessage}
				<p class="text-xs font-bold text-red-500 bg-red-50 p-2 rounded border border-red-100">{errorMessage}</p>
			{/if}

			<DialogFooter class="pt-4">
				<Button type="button" variant="ghost" onclick={() => (showFormDialog = false)}>Batal</Button>
				<Button type="submit" disabled={formLoading} class="bg-emerald-700 hover:bg-emerald-800 min-w-[100px]">
					{formLoading ? 'Menyimpan...' : 'Simpan Konversi'}
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

<!-- Delete Confirmation -->
<form
	action="?/delete"
	method="POST"
	use:enhance={() => {
		deleteLoading = true;
		return async ({ result }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			if (result.type === 'success') {
				await invalidateAll();
				handleNotification('Berhasil', 'Data konversi telah dihapus.', 'success');
			} else if (result.type === 'failure') {
				handleNotification('Gagal', result.data?.message || 'Gagal menghapus data.', 'error');
			}
		};
	}}
	id="delete-form"
>
	<input type="hidden" name="id" value={selectedId} />
</form>

<ConfirmationDialog
	bind:open={deleteDialogOpen}
	type="error"
	title="Hapus Konversi?"
	description="Data konversi ini akan dihapus permanen. Barang yang menggunakan konversi ini mungkin akan terpengaruh pada tampilan stok."
	actionLabel="Ya, Hapus"
	loading={deleteLoading}
	onAction={() => document.getElementById('delete-form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
/>

<!-- Notification Dialog -->
<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationTitle}
	description={notificationMsg}
	onAction={() => (notificationOpen = false)}
/>
