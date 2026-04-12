<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { ArrowLeft } from '@lucide/svelte';

	let { data, form }: PageProps = $props();

	let isLoading = $state(false);
	let notificationOpen = $state(false);

	// State untuk form internal (hanya untuk Select)
	let selectedBaseUnit = $state(data.consumable.baseUnit || '');

	let imagePreview = $state<string | null>(
		data.consumable.imagePath ? `/uploads/item/${data.consumable.imagePath}` : null
	);

	$effect(() => {
		if (form?.success) {
			notificationOpen = true;
		}
	});

	function handleBack() {
		goto(`/${data.user.organization.slug}/barang`);
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				imagePreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			imagePreview = data.consumable.imagePath
				? `/uploads/item/${data.consumable.imagePath}`
				: null;
		}
	}
</script>

<div class="mx-auto max-w-4xl space-y-8 p-8">
	<Card.Root>
		<Card.Content class="space-y-6">
			<div>
				<Card.Title>Edit Barang Habis Pakai</Card.Title>
				<Card.Description>
					Perbarui informasi untuk <strong>{data.consumable.name}</strong>
				</Card.Description>
			</div>

			<form
				method="POST"
				enctype="multipart/form-data"
				use:enhance={() => {
					isLoading = true;
					return async ({ update }) => {
						isLoading = false;
						await update();
					};
				}}
				class="grid grid-cols-1 gap-6 md:grid-cols-2"
			>
				<!-- Hidden Input for Select Value -->
				<input type="hidden" name="baseUnit" value={selectedBaseUnit} />

				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="image">Foto Barang</Label>
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div
							class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-slate-50"
						>
							{#if imagePreview}
								<img src={imagePreview} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<div class="text-center text-xs text-slate-400">Belum ada foto</div>
							{/if}
						</div>
						<div class="flex-1">
							<Input
								type="file"
								name="image"
								id="image"
								accept="image/*"
								onchange={handleImageChange}
								class="cursor-pointer"
							/>
							<p class="mt-1.5 text-[10px] text-slate-500">
								Format: JPG, PNG, atau WEBP. Maks: 5MB. Biarkan kosong jika tidak ingin mengubah
								foto.
							</p>
						</div>
					</div>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="name">Nama Barang</Label>
					<Input
						type="text"
						name="name"
						id="name"
						required
						value={data.consumable.name}
						placeholder="Contoh: Baterai AA"
					/>
				</div>

				<div class="flex flex-col gap-2">
					<Label for="baseUnit">Satuan Dasar</Label>
					<Select.Root
						type="single"
						bind:value={selectedBaseUnit}
						onValueChange={(v) => (selectedBaseUnit = v || '')}
					>
						<Select.Trigger class="w-full">
							{selectedBaseUnit || 'Pilih Satuan'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="PCS">PCS</Select.Item>
							<Select.Item value="BOX">BOX</Select.Item>
							<Select.Item value="METER">METER</Select.Item>
							<Select.Item value="ROLL">ROLL</Select.Item>
							<Select.Item value="UNIT">UNIT</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex flex-col gap-2 md:col-span-2">
					<Label for="description">Deskripsi / Keterangan</Label>
					<Textarea
						name="description"
						id="description"
						placeholder="Tambahkan catatan singkat tentang barang ini..."
						class="min-h-24"
						value={data.consumable.description || ''}
					/>
				</div>

				<div class="mt-4 flex gap-4 md:col-span-2">
					<Button variant="outline" onclick={handleBack} disabled={isLoading}>Batal</Button>
					<Button type="submit" disabled={isLoading}>
						{isLoading ? 'Menyimpan...' : 'Update Data Barang'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>

<NotificationDialog
	bind:open={notificationOpen}
	type="success"
	title="Berhasil"
	description="Data barang berhasil diperbarui"
	onAction={() => {
		notificationOpen = false;
		handleBack();
	}}
/>
