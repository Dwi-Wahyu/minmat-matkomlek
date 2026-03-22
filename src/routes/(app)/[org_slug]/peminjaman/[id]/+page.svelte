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
		RotateCcw
	} from '@lucide/svelte';

	let { data } = $props();

	// State Dialog
	let notificationOpen = $state(false);
	let notificationType = $state<'success' | 'error' | 'info'>('success');
	let notificationMsg = $state('');

	let approveDialogOpen = $state(false);
	let approveLoading = $state(false);

	let rejectDialogOpen = $state(false);
	let rejectLoading = $state(false);
	let rejectReason = $state('');

	let startDialogOpen = $state(false);
	let startLoading = $state(false);

	let returnDialogOpen = $state(false);
	let returnLoading = $state(false);

	const statusConfig = {
		DRAFT: {
			label: 'Menunggu Persetujuan',
			color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
			icon: Clock
		},
		APPROVED: {
			label: 'Disetujui',
			color: 'bg-blue-100 text-blue-700 border-blue-200',
			icon: CheckCircle2
		},
		REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
		DIPINJAM: {
			label: 'Sedang Dipinjam',
			color: 'bg-purple-100 text-purple-700 border-purple-200',
			icon: Package
		},
		KEMBALI: {
			label: 'Sudah Kembali',
			color: 'bg-green-100 text-green-700 border-green-200',
			icon: RotateCcw
		}
	};

	const currentStatus = $derived(statusConfig[data.lending.status as keyof typeof statusConfig]);

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
			{#if data.canApprove}
				<Button
					variant="outline"
					class="border-red-200 text-red-600 hover:bg-red-50"
					onclick={() => (rejectDialogOpen = true)}
				>
					Tolak Pengajuan
				</Button>
				<Button
					class="bg-green-600 text-white hover:bg-green-700"
					onclick={() => (approveDialogOpen = true)}
				>
					Setujui Pengajuan
				</Button>
			{/if}

			{#if data.lending.status === 'APPROVED' && data.userId === data.lending.requestedBy}
				<Button class="bg-blue-600 hover:bg-blue-700" onclick={() => (startDialogOpen = true)}>
					<PlayCircle class="mr-2 size-4" />
					Barang Diambil
				</Button>
			{/if}

			{#if data.lending.status === 'DIPINJAM' && data.userId === data.lending.requestedBy}
				<Button class="bg-purple-600 hover:bg-purple-700" onclick={() => (returnDialogOpen = true)}>
					<RotateCcw class="mr-2 size-4" />
					Kembalikan Barang
				</Button>
			{/if}
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
							<div class="rounded-lg border border-red-200 bg-red-50 p-4">
								<div class="mb-1 flex items-center gap-2 font-bold text-red-700">
									<AlertCircle class="size-4" />
									Alasan Penolakan
								</div>
								<p class="text-sm text-red-600">{data.lending.rejectedReason}</p>
							</div>
						{/if}

						{#if data.lending.approvedByUser}
							<div class="flex items-center gap-3 border-t pt-2">
								<div class="rounded-full bg-blue-50 p-2 text-blue-600">
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
						{#each data.lending.items as item}
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
						{#each data.lending.approvals as log}
							<div class="flex gap-4">
								<div class="flex flex-col items-center">
									<div class={log.status === 'APPROVED' ? 'text-green-500' : 'text-red-500'}>
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
							<div class="text-yellow-500">
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
			}
		};
	}}
	hidden
>
	<input type="hidden" name="id" value={data.lending.id} />
</form>

<!-- DIALOGS -->
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
