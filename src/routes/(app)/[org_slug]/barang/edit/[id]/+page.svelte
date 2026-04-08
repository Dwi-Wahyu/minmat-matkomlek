<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';
	let { data, form }: PageProps = $props();

	let isLoading = $state(false);

	let imagePreview = $state<string | null>(
		data.consumable.imagePath ? `/uploads/item/${data.consumable.imagePath}` : null
	);

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

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-gray-800">Edit Barang Habis Pakai</h1>
		<p class="text-sm text-gray-500">
			Perbarui informasi untuk <strong>{data.consumable.name}</strong>
		</p>
	</div>

	{#if form?.success}
		<div class="mb-6 rounded-lg border border-green-200 bg-green-100 p-4 text-green-700">
			Berhasil memperbarui data barang.
		</div>
	{/if}

	<form
		method="POST"
		enctype="multipart/form-data"
		use:enhance={() => {
			isLoading = true;
			return async ({ update }) => {
				isLoading = false;
				update();
			};
		}}
		class="flex flex-col gap-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm"
	>
		<div class="flex flex-col gap-2">
			<label for="image" class="text-sm font-semibold text-gray-700">Foto Barang</label>
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
					<input
						type="file"
						name="image"
						id="image"
						accept="image/*"
						onchange={handleImageChange}
						class="w-full cursor-pointer rounded-lg border p-2 text-sm"
					/>
					<p class="mt-1.5 text-[10px] text-gray-500">
						Format: JPG, PNG, atau WEBP. Maks: 5MB. Biarkan kosong jika tidak ingin mengubah foto.
					</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
			<div class="flex flex-col gap-2">
				<label for="name" class="text-sm font-semibold text-gray-700">Nama Barang</label>
				<input
					type="text"
					name="name"
					id="name"
					required
					value={data.consumable.name}
					class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<div class="flex flex-col gap-2">
				<label for="baseUnit" class="text-sm font-semibold text-gray-700">Satuan Dasar</label>
				<select
					name="baseUnit"
					id="baseUnit"
					required
					class="rounded-lg border bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
				>
					{#each ['PCS', 'BOX', 'METER', 'ROLL', 'UNIT'] as unit}
						<option value={unit} selected={unit === data.consumable.baseUnit}>
							{unit}
						</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<label for="description" class="text-sm font-semibold text-gray-700"
				>Deskripsi / Keterangan</label
			>
			<textarea
				name="description"
				id="description"
				rows="4"
				class="rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
				>{data.consumable.description || ''}</textarea
			>
		</div>

		<div class="mt-4 flex gap-3">
			<a
				href="/{data.user.organization.slug}/barang"
				class="flex-1 rounded-lg border border-gray-300 py-3 text-center font-medium transition hover:bg-gray-50"
			>
				Batal
			</a>
			<button
				disabled={isLoading}
				type="submit"
				class="flex-2 rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
			>
				{isLoading ? 'Menyimpan...' : 'Update Data Barang'}
			</button>
		</div>
	</form>
</div>
