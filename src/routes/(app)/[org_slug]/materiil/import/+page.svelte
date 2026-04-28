<script lang="ts">
	import { page } from '$app/state';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Upload,
		FileSpreadsheet,
		CheckCircle2,
		XCircle,
		AlertTriangle,
		Loader2,
		Download,
		History,
		ChevronLeft,
		ChevronRight,
		Info
	} from '@lucide/svelte';
	import * as XLSX from 'xlsx';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';

	let { data } = $props();

	// State
	let fileInput = $state<HTMLInputElement | null>(null);
	let rawData = $state<any[]>([]);
	let fileName = $state('');
	let isProcessing = $state(false);
	let isUploading = $state(false);

	// Pagination
	let currentPage = $state(1);
	let pageSize = 10;

	// Dialogs
	let showConfirm = $state(false);
	let showSuccessDialog = $state(false);

	// Derived data
	const totalRows = $derived(rawData.length);
	const totalPages = $derived(Math.ceil(totalRows / pageSize));
	const paginatedData = $derived(
		rawData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	// Validation
	const validationResults = $derived(
		rawData.map((row, index) => {
			const errors: string[] = [];
			const warnings: string[] = [];

			if (!row.NamaBarang) errors.push('Nama Barang wajib diisi');
			if (!row.Tipe) errors.push('Tipe wajib diisi');
			if (!['ASSET', 'CONSUMABLE'].includes(row.Tipe)) errors.push('Tipe tidak valid');
			if (!row.SatuanDasar) errors.push('Satuan Dasar wajib diisi');

			if (row.Tipe === 'ASSET' && !row.Jumlah) {
				// Default 1 if missing for asset
			} else if (row.Tipe === 'CONSUMABLE' && (row.Jumlah === undefined || row.Jumlah === null)) {
				errors.push('Jumlah wajib diisi untuk barang habis pakai');
			}

			// Cek duplikasi nomor seri di file lokal
			if (row.NomorSeri) {
				const isDuplicateInFile = rawData.some(
					(r, i) => i !== index && r.NomorSeri === row.NomorSeri
				);
				if (isDuplicateInFile) errors.push(`Nomor Seri duplikat dalam file: ${row.NomorSeri}`);
			}

			return { valid: errors.length === 0, errors, warnings };
		})
	);

	const hasErrors = $derived(validationResults.some((r) => !r.valid));

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		fileName = file.name;
		isProcessing = true;

		const reader = new FileReader();
		reader.onload = (evt) => {
			try {
				const bstr = evt.target?.result;
				const wb = XLSX.read(bstr, { type: 'binary' });
				const wsname = wb.SheetNames[0];
				const ws = wb.Sheets[wsname];
				const data = XLSX.utils.sheet_to_json(ws);

				rawData = data;
				currentPage = 1;
				toast.success(`Berhasil memuat ${data.length} baris data`);
			} catch (err) {
				console.error(err);
				toast.error('Gagal membaca file Excel');
			} finally {
				isProcessing = false;
			}
		};
		reader.readAsBinaryString(file);
	}

	function reset() {
		rawData = [];
		fileName = '';
		if (fileInput) fileInput.value = '';
	}

	function startImport() {
		if (hasErrors) {
			toast.error('Mohon perbaiki data yang tidak valid sebelum melanjutkan');
			return;
		}
		showConfirm = true;
	}

	function formatDateTime(date: Date | string) {
		return new Date(date).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="flex flex-col gap-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Import Inventaris</h1>
			<p class="text-muted-foreground">
				Unggah file Excel untuk memasukkan data materiil secara massal.
			</p>
		</div>
		<Button variant="outline" href="/templates/template_import_inventaris.xlsx" download>
			<Download class="mr-2 size-4" />
			Unduh Template
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Upload Card -->
		<Card.Root class="lg:col-span-1">
			<Card.Header>
				<Card.Title>Unggah File</Card.Title>
				<Card.Description>Pilih file .xlsx yang sudah diisi sesuai template.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div
					class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:bg-muted/50"
					onclick={() => fileInput?.click()}
					onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
					role="button"
					tabindex="0"
				>
					<Upload class="mb-4 size-10 text-muted-foreground" />
					<p class="text-center text-sm font-medium">Klik untuk pilih file</p>
					<p class="mt-1 text-center text-xs text-muted-foreground">Hanya mendukung format .xlsx</p>
					<input
						type="file"
						accept=".xlsx"
						class="hidden"
						bind:this={fileInput}
						onchange={handleFileUpload}
					/>
				</div>

				{#if fileName}
					<div class="flex items-center gap-3 rounded-md border p-3">
						<FileSpreadsheet class="size-6 text-primary" />
						<div class="flex-1 overflow-hidden">
							<p class="truncate text-sm font-medium">{fileName}</p>
							<p class="text-xs text-muted-foreground">{totalRows} baris ditemukan</p>
						</div>
						<Button variant="ghost" size="icon" onclick={reset}>
							<XCircle class="size-4" />
						</Button>
					</div>
				{/if}

				{#if rawData.length > 0}
					<Button class="w-full" disabled={hasErrors || isUploading} onclick={startImport}>
						{#if isUploading}
							<Loader2 class="mr-2 size-4 animate-spin" />
							Memproses...
						{:else}
							<CheckCircle2 class="mr-2 size-4" />
							Proses Import
						{/if}
					</Button>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Data Preview / Instructions -->
		<Card.Root class="lg:col-span-2">
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>Pratinjau Data</Card.Title>
						<Card.Description>Periksa data sebelum dimasukkan ke database.</Card.Description>
					</div>
					{#if totalRows > 0}
						<Badge variant={hasErrors ? 'destructive' : 'outline'}>
							{validationResults.filter((r) => !r.valid).length} Error ditemukan
						</Badge>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				{#if rawData.length === 0}
					<div class="flex h-[400px] flex-col items-center justify-center text-muted-foreground">
						<Info class="mb-2 size-12 opacity-20" />
						<p>Belum ada data untuk ditampilkan.</p>
						<p class="text-xs">Silakan unggah file terlebih dahulu.</p>
					</div>
				{:else}
					<div class="relative overflow-x-auto rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-[50px]">No</Table.Head>
									<Table.Head>Status</Table.Head>
									<Table.Head>Nama Barang</Table.Head>
									<Table.Head>Tipe</Table.Head>
									<Table.Head>No. Seri</Table.Head>
									<Table.Head>Satuan</Table.Head>
									<Table.Head>Jumlah</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each paginatedData as row, i}
									{@const rowIndex = (currentPage - 1) * pageSize + i}
									{@const validation = validationResults[rowIndex]}
									<Table.Row class={!validation.valid ? 'bg-destructive/5' : ''}>
										<Table.Cell>{rowIndex + 1}</Table.Cell>
										<Table.Cell>
											{#if validation.valid}
												<CheckCircle2 class="size-4 text-success" />
											{:else}
												<div class="group relative">
													<XCircle class="size-4 cursor-help text-destructive" />
													<div
														class="invisible absolute bottom-full left-0 z-50 mb-2 w-48 rounded bg-popover p-2 text-xs text-popover-foreground shadow-md group-hover:visible"
													>
														<ul class="list-disc pl-3">
															{#each validation.errors as err}
																<li>{err}</li>
															{/each}
														</ul>
													</div>
												</div>
											{/if}
										</Table.Cell>
										<Table.Cell class="font-medium">{row.NamaBarang || '-'}</Table.Cell>
										<Table.Cell>
											<Badge variant="secondary">{row.Tipe || '-'}</Badge>
										</Table.Cell>
										<Table.Cell>{row.NomorSeri || '-'}</Table.Cell>
										<Table.Cell>{row.SatuanDasar || '-'}</Table.Cell>
										<Table.Cell>{row.Jumlah ?? '-'}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					<!-- Pagination -->
					<div class="mt-4 flex items-center justify-between">
						<p class="text-xs text-muted-foreground">
							Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(
								currentPage * pageSize,
								totalRows
							)} dari {totalRows} baris
						</p>
						<div class="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								disabled={currentPage === 1}
								onclick={() => currentPage--}
							>
								<ChevronLeft class="size-4" />
							</Button>
							<span class="text-sm font-medium">{currentPage} / {totalPages}</span>
							<Button
								variant="outline"
								size="icon"
								disabled={currentPage === totalPages}
								onclick={() => currentPage++}
							>
								<ChevronRight class="size-4" />
							</Button>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- History Table -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-2">
				<History class="size-5" />
				<Card.Title>Riwayat Import Terbaru</Card.Title>
			</div>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Waktu</Table.Head>
						<Table.Head>Nama File</Table.Head>
						<Table.Head>Oleh</Table.Head>
						<Table.Head>Total</Table.Head>
						<Table.Head>Berhasil</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.history.length === 0}
						<Table.Row>
							<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
								Belum ada riwayat import.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.history as log}
							<Table.Row>
								<Table.Cell>{formatDateTime(log.createdAt)}</Table.Cell>
								<Table.Cell class="font-medium">{log.filename}</Table.Cell>
								<Table.Cell>{log.user?.name || '-'}</Table.Cell>
								<Table.Cell>{log.totalRows}</Table.Cell>
								<Table.Cell class="font-bold text-success">{log.successRows}</Table.Cell>
								<Table.Cell>
									<Badge variant={log.status === 'SUCCESS' ? 'default' : 'destructive'}>
										{log.status}
									</Badge>
									{#if log.errorMessage}
										<div
											class="mt-1 max-w-[200px] truncate text-[10px] text-destructive"
											title={log.errorMessage}
										>
											{log.errorMessage}
										</div>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>

<!-- Confirmation Dialog -->
<ConfirmationDialog
	bind:open={showConfirm}
	title="Konfirmasi Import Data"
	description="Apakah Anda yakin ingin memasukkan {totalRows} data ini ke sistem? Data akan otomatis masuk ke gudang default kesatuan."
	type="info"
	actionLabel="Ya, Import Sekarang"
	loading={isUploading}
	onAction={() => {
		const form = document.getElementById('import-form') as HTMLFormElement;
		form.requestSubmit();
	}}
/>

<!-- Form Tersembunyi untuk Action -->
<form
	id="import-form"
	method="POST"
	action="?/import"
	use:enhance={() => {
		isUploading = true;
		showConfirm = false;
		return async ({ result }) => {
			isUploading = false;
			if (result.type === 'success') {
				toast.success('Berhasil mengimport data!');
				showSuccessDialog = true;
				reset();
			} else if (result.type === 'failure') {
				toast.error('Gagal mengimport data');
			}
		};
	}}
	class="hidden"
>
	<input type="hidden" name="data" value={JSON.stringify(rawData)} />
	<input type="hidden" name="filename" value={fileName} />
</form>

<!-- Success Modal -->
<ConfirmationDialog
	bind:open={showSuccessDialog}
	type="success"
	title="Import Berhasil!"
	description="Data materiil telah berhasil dimasukkan ke sistem. Anda dapat melihat detailnya di riwayat import atau menu data materiil."
	actionLabel="Tutup"
	onAction={() => (showSuccessDialog = false)}
/>
