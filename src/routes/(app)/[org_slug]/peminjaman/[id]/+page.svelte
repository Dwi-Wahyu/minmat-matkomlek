<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { cn } from '$lib/utils';
	import {
		ChevronLeft,
		CheckCircle2,
		XCircle,
		Clock,
		Package,
		History,
		User,
		AlertCircle,
		PlayCircle,
		RotateCcw,
		Download,
		FileText
	} from '@lucide/svelte';

	let { data } = $props();

	// State Dialog
	let notificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationMsg = $state('');

	let approveDialogOpen = $state(false);
	let approveLoading = $state(false);

	let overrideDialogOpen = $state(false);
	let overrideLoading = $state(false);
	let overrideReason = $state('');

	let rejectDialogOpen = $state(false);
	let rejectLoading = $state(false);
	let rejectReason = $state('');

	let startDialogOpen = $state(false);
	let startLoading = $state(false);

	let returnDialogOpen = $state(false);
	let returnLoading = $state(false);

	let deleteDialogOpen = $state(false);
	let deleteLoading = $state(false);

	const statusConfig = {
		DRAFT: {
			label: 'Menunggu Persetujuan',
			color: 'bg-secondary/10 text-secondary border-secondary/20',
			icon: Clock
		},
		APPROVED: {
			label: 'Disetujui',
			color: 'bg-primary/10 text-primary border-primary/20',
			icon: CheckCircle2
		},
		REJECTED: { label: 'Ditolak', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
		PERINTAH_LANGSUNG: {
			label: 'Perintah Langsung',
			color: 'bg-secondary/10 text-secondary border-secondary/20',
			icon: AlertCircle
		},
		DIPINJAM: {
			label: 'Sedang Dipinjam',
			color: 'bg-primary/10 text-primary border-primary/20',
			icon: Package
		},
		KEMBALI: {
			label: 'Sudah Kembali',
			color: 'bg-success/10 text-success border-success/20',
			icon: RotateCcw
		}
	};

	const currentStatus = $derived(statusConfig[data.lending.status as keyof typeof statusConfig]);

	const steps = $derived([
		{ status: 'DRAFT', label: 'Draft', icon: Clock },
		{
			status: data.lending.status === 'PERINTAH_LANGSUNG' ? 'PERINTAH_LANGSUNG' : 'APPROVED',
			label: data.lending.status === 'PERINTAH_LANGSUNG' ? 'Perintah' : 'Disetujui',
			icon: data.lending.status === 'PERINTAH_LANGSUNG' ? AlertCircle : CheckCircle2
		},
		{ status: 'DIPINJAM', label: 'Dipinjam', icon: Package },
		{ status: 'KEMBALI', label: 'Kembali', icon: RotateCcw }
	]);

	function formatDate(date: any) {
		if (!date) return '-';
		return new Date(date).toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" href="/{page.params.org_slug}/peminjaman">
				<ChevronLeft class="size-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-foreground">Detail Peminjaman</h1>
				<div class="mt-1 flex items-center gap-2">
					<Badge variant="outline" class={currentStatus.color}>
						<currentStatus.icon class="mr-1 size-3" />
						{currentStatus.label}
					</Badge>
					<span class="text-xs text-muted-foreground">ID: {data.lending.id}</span>
				</div>
			</div>
		</div>

		<div class="flex gap-2">
			{#if data.canDelete}
				<Button
					variant="outline"
					class="border-destructive/20 text-destructive hover:bg-destructive/10"
					onclick={() => (deleteDialogOpen = true)}
				>
					Hapus Pengajuan
				</Button>
			{/if}

			{#if data.canOverride}
				<Button
					variant="outline"
					class="border-secondary/20 text-secondary hover:bg-secondary/10"
					onclick={() => (overrideDialogOpen = true)}
				>
					Perintah Langsung
				</Button>
			{/if}

			{#if data.canApprove}
				<Button
					variant="outline"
					class="border-destructive/20 text-destructive hover:bg-destructive/10"
					onclick={() => (rejectDialogOpen = true)}
				>
					Tolak Pengajuan
				</Button>
				<Button
					class="bg-success text-success-foreground hover:bg-success/90"
					onclick={() => (approveDialogOpen = true)}
				>
					Setujui Pengajuan
				</Button>
			{/if}

			{#if data.canExecute}
				<Button class="bg-primary text-primary-foreground hover:bg-primary/90" onclick={() => (startDialogOpen = true)}>
					<PlayCircle class="mr-2 size-4" />
					Barang Diambil
				</Button>
			{/if}

			{#if data.canReturn}
				<Button class="bg-secondary text-secondary-foreground hover:bg-secondary/90" onclick={() => (returnDialogOpen = true)}>
					<RotateCcw class="mr-2 size-4" />
					Kembalikan Barang
				</Button>
			{/if}
		</div>
	</div>

	<!-- Stepper -->
	<div class="mb-2">
		<div class="grid grid-cols-4 gap-2 rounded-xl border bg-card p-4 shadow-sm md:p-6">
			{#each steps as step, i (step.status)}
				{@const statusOrder = ['DRAFT', 'APPROVED', 'PERINTAH_LANGSUNG', 'DIPINJAM', 'KEMBALI']}
				{@const currentIndex = statusOrder.indexOf(data.lending.status)}
				{@const stepIndex = statusOrder.indexOf(step.status)}
				{@const isCompleted =
					data.lending.status === 'REJECTED' ? false : currentIndex >= stepIndex}
				{@const isActive = data.lending.status === step.status}

				<div class="relative flex flex-col items-center gap-2">
					<div
						class={cn(
							'z-10 flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300 md:size-12',
							isActive
								? 'border-primary bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20'
								: isCompleted
									? 'border-success bg-success text-success-foreground'
									: 'border-muted bg-muted text-muted-foreground'
						)}
					>
						{#if data.lending.status === 'REJECTED' && i === 1}
							<XCircle class="size-5 md:size-6" />
						{:else if isCompleted && !isActive}
							<CheckCircle2 class="size-5 md:size-6" />
						{:else}
							<step.icon class="size-5 md:size-6" />
						{/if}
					</div>
					<span
						class={cn(
							'text-[10px] font-bold tracking-tight md:text-xs',
							isActive ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'
						)}
					>
						{step.label}
					</span>

					{#if i < steps.length - 1}
						<div
							class={cn(
								'absolute top-5 left-[calc(50%+25px)] h-0.5 w-[calc(100%-50px)] md:top-6',
								isCompleted && statusOrder.indexOf(data.lending.status) > statusOrder.indexOf(step.status)
									? 'bg-success'
									: 'bg-muted'
							)}
						></div>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<Tabs value="info" class="w-full">
		<TabsList class="grid w-full max-w-md grid-cols-3">
			<TabsTrigger value="info">Informasi</TabsTrigger>
			<TabsTrigger value="items">Daftar Alat ({data.lending.items.length})</TabsTrigger>
			<TabsTrigger value="history">Riwayat</TabsTrigger>
		</TabsList>

		<TabsContent value="info" class="mt-6 space-y-6">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<!-- General Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-lg">Informasi Operasional</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-1">
								<Label class="text-xs text-muted-foreground uppercase">Unit Peminjam</Label>
								<p class="font-medium">{data.lending.unit}</p>
							</div>
							<div class="space-y-1">
								<Label class="text-xs text-muted-foreground uppercase">Tujuan</Label>
								<p><Badge variant="secondary">{data.lending.purpose}</Badge></p>
							</div>
							<div class="space-y-1">
								<Label class="text-xs text-muted-foreground uppercase">Rencana Mulai</Label>
								<p class="text-sm">{formatDate(data.lending.startDate)}</p>
							</div>
							<div class="space-y-1">
								<Label class="text-xs text-muted-foreground uppercase">Rencana Selesai</Label>
								<p class="text-sm">{formatDate(data.lending.endDate)}</p>
							</div>
						</div>
						<Separator />
						<div class="space-y-1">
							<Label class="text-xs text-muted-foreground uppercase">Satuan Pemilik Aset</Label>
							<p class="text-sm font-semibold">{data.lending.organization?.name}</p>
						</div>

						{#if data.lending.attachmentPath}
							<Separator />
							<div class="space-y-2">
								<Label class="text-xs text-muted-foreground uppercase">Dokumen Pendukung</Label>
								<div
									class="flex items-center justify-between rounded-md border bg-muted/50 p-3 transition-colors hover:bg-muted"
								>
									<div class="flex items-center gap-3 overflow-hidden">
										<div class="rounded bg-background p-2 text-primary shadow-sm">
											<FileText class="size-5" />
										</div>
										<div class="overflow-hidden">
											<p class="truncate text-sm font-medium">
												{data.lending.attachmentName || 'Dokumen Peminjaman'}
											</p>
											<p class="text-[10px] text-muted-foreground uppercase">PDF / DOCX</p>
										</div>
									</div>
									<Button
										variant="outline"
										size="sm"
										href={data.lending.attachmentPath}
										download={data.lending.attachmentName}
										class="shrink-0"
									>
										<Download class="mr-2 size-4" />
										Unduh
									</Button>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Requester Info -->
				<Card.Root>
					<Card.Header>
						<Card.Title class="text-lg">Pemohon & Persetujuan</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-muted p-2">
								<User class="size-5" />
							</div>
							<div>
								<Label class="text-xs text-muted-foreground uppercase">Diajukan Oleh</Label>
								<p class="text-sm font-medium">{data.lending.requestedByUser?.name}</p>
								<p class="text-xs text-muted-foreground">{data.lending.requestedByUser?.email}</p>
							</div>
						</div>

						{#if data.lending.status === 'REJECTED'}
							<div class="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
								<div class="mb-1 flex items-center gap-2 font-bold text-destructive">
									<AlertCircle class="size-4" />
									Alasan Penolakan
								</div>
								<p class="text-sm text-destructive/80">{data.lending.rejectedReason}</p>
							</div>
						{/if}

						{#if data.lending.status === 'PERINTAH_LANGSUNG'}
							<div class="rounded-lg border border-secondary/20 bg-secondary/10 p-4">
								<div class="mb-1 flex items-center gap-2 font-bold text-secondary">
									<AlertCircle class="size-4" />
									Perintah Langsung (Command Override)
								</div>
								<p class="text-sm text-secondary/80">{data.lending.overrideReason}</p>
								<p class="mt-2 text-xs font-medium text-secondary italic">
									Oleh: {data.lending.overrideByUser?.name || 'Pimpinan'}
								</p>
							</div>
						{/if}

						{#if data.lending.approvedByUser}
							<div class="flex items-center gap-3 border-t pt-2">
								<div class="rounded-full bg-primary/10 p-2 text-primary">
									<CheckCircle2 class="size-5" />
								</div>
								<div>
									<Label class="text-xs text-muted-foreground uppercase">Diproses Oleh</Label>
									<p class="text-sm font-medium">{data.lending.approvedByUser?.name}</p>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</TabsContent>

		<TabsContent value="items" class="mt-6">
			<Card.Root>
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Nama Alat</Table.Head>
							<Table.Head>Serial Number</Table.Head>
							<Table.Head>Brand</Table.Head>
							<Table.Head>Gudang</Table.Head>
							<Table.Head class="text-right">Qty</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.lending.items as item (item.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{item.equipment.item.name}</Table.Cell>
								<Table.Cell
									><code class="rounded bg-muted px-1 text-xs">{item.equipment.serialNumber}</code
									></Table.Cell
								>
								<Table.Cell>{item.equipment.brand}</Table.Cell>
								<Table.Cell>{item.equipment.warehouse?.name}</Table.Cell>
								<Table.Cell class="text-right font-bold">{item.qty}</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Root>
		</TabsContent>

		<TabsContent value="history" class="mt-6">
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="space-y-6">
						{#each data.lending.approvals as log (log.id)}
							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div class={log.status === 'APPROVED' ? 'text-success' : 'text-destructive'}>
										<History class="size-5" />
									</div>
									<div class="mt-2 h-full w-px bg-border"></div>
								</div>
								<div class="space-y-1 pb-6">
									<p class="text-sm font-bold">
										{log.status === 'APPROVED' ? 'Persetujuan Diterima' : 'Pengajuan Ditolak'}
									</p>
									<p class="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
									<p class="mt-2 text-sm text-muted-foreground italic">"{log.note}"</p>
									<p class="text-xs font-medium">Oleh: {log.approvedByUser?.name}</p>
								</div>
							</div>
						{/each}
						<div class="flex gap-4">
							<div class="text-primary">
								<Clock class="size-5" />
							</div>
							<div>
								<p class="text-sm font-bold">Pengajuan Dibuat</p>
								<p class="text-xs text-muted-foreground">{formatDate(data.lending.createdAt)}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</TabsContent>
	</Tabs>
</div>

<!-- ACTIONS FORMS -->
<form
	id="override-form"
	method="POST"
	action="?/override"
	use:enhance={() => {
		overrideLoading = true;
		return ({ result }) => {
			overrideLoading = false;
			overrideDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal melakukan override perintah langsung';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
	<input type="hidden" name="reason" value={overrideReason} />
</form>

<form
	id="approve-form"
	method="POST"
	action="?/approve"
	use:enhance={() => {
		approveLoading = true;
		return ({ result }) => {
			approveLoading = false;
			approveDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal menyetujui peminjaman';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<form
	id="reject-form"
	method="POST"
	action="?/reject"
	use:enhance={() => {
		rejectLoading = true;
		return ({ result }) => {
			rejectLoading = false;
			rejectDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal menolak peminjaman';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
	<input type="hidden" name="reason" value={rejectReason} />
</form>

<form
	id="start-form"
	method="POST"
	action="?/startLending"
	use:enhance={() => {
		startLoading = true;
		return ({ result }) => {
			startLoading = false;
			startDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal memproses pengambilan barang';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<form
	id="return-form"
	method="POST"
	action="?/returnLending"
	use:enhance={() => {
		returnLoading = true;
		return ({ result }) => {
			returnLoading = false;
			returnDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = result.data?.message;
				notificationType = 'success';
				notificationOpen = true;
				invalidateAll();
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal memproses pengembalian barang';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<!-- DIALOGS -->
<form
	id="delete-form"
	method="POST"
	action="?/delete"
	use:enhance={() => {
		deleteLoading = true;
		return ({ result }) => {
			deleteLoading = false;
			deleteDialogOpen = false;
			if (result.type === 'success') {
				notificationMsg = 'Pengajuan telah dihapus';
				notificationType = 'success';
				notificationOpen = true;
				setTimeout(() => {
					window.location.href = `/${page.params.org_slug}/peminjaman`;
				}, 1500);
			} else if (result.type === 'failure') {
				notificationMsg = result.data?.message || 'Gagal menghapus pengajuan';
				notificationType = 'error';
				notificationOpen = true;
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<ConfirmationDialog
	bind:open={deleteDialogOpen}
	loading={deleteLoading}
	type="error"
	title="Hapus Pengajuan"
	description="Apakah Anda yakin ingin menghapus pengajuan peminjaman ini? Tindakan ini tidak dapat dibatalkan."
	actionLabel="Hapus"
	onAction={() => document.getElementById('delete-form').requestSubmit()}
/>

<ConfirmationDialog
	bind:open={approveDialogOpen}
	loading={approveLoading}
	type="success"
	title="Setujui Peminjaman"
	description="Apakah Anda yakin ingin menyetujui pengajuan peminjaman alat ini?"
	actionLabel="Setujui"
	onAction={() => document.getElementById('approve-form').requestSubmit()}
/>

<ConfirmationDialog
	bind:open={overrideDialogOpen}
	loading={overrideLoading}
	type="info"
	title="Perintah Langsung (Command Override)"
	description="Gunakan fitur ini hanya untuk instruksi mendesak atau operasi militer khusus yang melompati jalur persetujuan normal."
	actionLabel="Konfirmasi Perintah"
	onAction={() => {
		if (!overrideReason) return alert('Alasan perintah harus diisi');
		document.getElementById('override-form').requestSubmit();
	}}
>
	<div class="mt-4">
		<Label for="overrideReason">Alasan Perintah / Keterangan Operasi</Label>
		<Textarea
			bind:value={overrideReason}
			placeholder="Contoh: Perintah Ops Darurat Mabes TNI..."
			class="mt-2"
			required
		/>
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={rejectDialogOpen}
	loading={rejectLoading}
	type="error"
	title="Tolak Peminjaman"
	description="Masukkan alasan penolakan pengajuan ini."
	actionLabel="Tolak"
	onAction={() => {
		if (!rejectReason) return alert('Alasan harus diisi');
		document.getElementById('reject-form').requestSubmit();
	}}
>
	<div class="mt-4">
		<Label for="reason">Alasan Penolakan</Label>
		<Textarea
			bind:value={rejectReason}
			placeholder="Contoh: Alat sedang dibutuhkan untuk operasi lain..."
			class="mt-2"
			required
		/>
	</div>
</ConfirmationDialog>

<ConfirmationDialog
	bind:open={startDialogOpen}
	loading={startLoading}
	type="info"
	title="Konfirmasi Pengambilan"
	description="Konfirmasi bahwa barang telah diserahterimakan kepada unit peminjam."
	actionLabel="Konfirmasi"
	onAction={() => document.getElementById('start-form').requestSubmit()}
/>

<ConfirmationDialog
	bind:open={returnDialogOpen}
	loading={returnLoading}
	type="success"
	title="Konfirmasi Pengembalian"
	description="Pastikan semua alat telah diperiksa kondisinya sebelum dikembalikan ke gudang."
	actionLabel="Selesai"
	onAction={() => document.getElementById('return-form').requestSubmit()}
/>

<NotificationDialog
	bind:open={notificationOpen}
	type={notificationType}
	title={notificationType === 'success' ? 'Berhasil' : 'Terjadi Kesalahan'}
	description={notificationMsg}
/>
