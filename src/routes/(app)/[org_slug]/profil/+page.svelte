<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import {
		UserRound,
		Mail,
		Monitor,
		Smartphone,
		Globe,
		Lock,
		Trash2,
		History,
		KeyRound,
		ShieldCheck
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// State for session revocation dialog
	let revokeDialogOpen = $state(false);
	let selectedToken = $state('');
	let isRevoking = $state(false);

	// State for active tab
	let activeTab = $state('sessions');

	function formatDate(date: Date | string | number) {
		return new Date(date).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getDeviceIcon(userAgent: string | null) {
		if (!userAgent) return Monitor;
		const ua = userAgent.toLowerCase();
		if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return Smartphone;
		return Monitor;
	}

	function triggerRevoke(token: string) {
		selectedToken = token;
		revokeDialogOpen = true;
	}
</script>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<div>
		<h1 class="text-3xl font-bold tracking-tight text-foreground">Profil Saya</h1>
		<p class="text-muted-foreground">Kelola informasi akun dan keamanan sesi Anda.</p>
	</div>

	{#if form?.success}
		<div class="flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-success">
			<ShieldCheck class="size-5" />
			{form.message}
		</div>
	{:else if form?.message}
		<div class="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			<Trash2 class="size-5" />
			{form.message}
		</div>
	{/if}

	<div class="grid gap-8 lg:grid-cols-12">
		<!-- Profil User -->
		<div class="lg:col-span-4 space-y-6">
			<Card.Root class="overflow-hidden border-none shadow-sm ring-1 ring-border">
				<Card.Header class="bg-muted/30 pb-8 text-center pt-8 border-b">
					<div
						class="mx-auto mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-sm"
					>
						{#if data.user.image}
							<img src={data.user.image} alt={data.user.name} class="h-full w-full object-cover" />
						{:else}
							<UserRound class="h-14 w-14 text-muted-foreground" />
						{/if}
					</div>
					<Card.Title class="text-xl">{data.user.name}</Card.Title>
					<Card.Description class="font-mono text-xs">@{data.user.username}</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6 pt-6">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hak Akses</Label>
							<span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
								{data.user.role}
							</span>
						</div>
						<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
							<ShieldCheck class="h-4 w-4 text-muted-foreground" />
							<span class="font-medium text-foreground uppercase">{data.user.role}</span>
						</div>
					</div>
					
					<div class="space-y-3">
						<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Kesatuan</Label>
						<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
							<Globe class="h-4 w-4 text-muted-foreground" />
							<span class="font-medium text-foreground">{data.user.organization.name}</span>
						</div>
					</div>

					<div class="space-y-3">
						<Label class="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</Label>
						<div class="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
							<Mail class="h-4 w-4 text-muted-foreground" />
							<span class="truncate font-medium text-foreground">{data.user.email}</span>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Manajemen Sesi & Password -->
		<div class="lg:col-span-8 space-y-8">
			<!-- Ubah Password -->
			<Card.Root class="border-none shadow-sm ring-1 ring-border">
				<Card.Header>
					<div class="flex items-center gap-3">
						<div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
							<KeyRound class="size-5" />
						</div>
						<div>
							<Card.Title>Ubah Password</Card.Title>
							<Card.Description>Amankan akun Anda dengan mengganti password secara berkala.</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<form action="?/changePassword" method="POST" use:enhance class="space-y-5">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2 sm:col-span-2">
								<Label for="currentPassword">Password Saat Ini</Label>
								<Input
									id="currentPassword"
									name="currentPassword"
									type="password"
									placeholder="Masukkan password saat ini"
									required
									class="bg-muted/20"
								/>
							</div>
							<div class="space-y-2">
								<Label for="newPassword">Password Baru</Label>
								<Input
									id="newPassword"
									name="newPassword"
									type="password"
									placeholder="Min. 3 karakter"
									required
									class="bg-muted/20"
								/>
							</div>
							<div class="space-y-2">
								<Label for="confirmPassword">Konfirmasi Password Baru</Label>
								<Input
									id="confirmPassword"
									name="confirmPassword"
									type="password"
									placeholder="Ulangi password baru"
									required
									class="bg-muted/20"
								/>
							</div>
						</div>
						<div class="flex justify-end pt-2">
							<Button type="submit" class="w-full sm:w-auto px-8">Update Password</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Sesi & Riwayat -->
			<Tabs.Root bind:value={activeTab} class="space-y-6">
				<Tabs.List variant="line" class="w-full justify-start border-b rounded-none px-0 h-auto bg-transparent">
					<Tabs.Trigger value="sessions" class="rounded-none border-b-2 border-transparent data-active:border-primary px-6 py-3 bg-transparent data-active:bg-transparent">
						<div class="flex items-center gap-2">
							<Monitor class="size-4" />
							<span>Sesi Aktif</span>
						</div>
					</Tabs.Trigger>
					<Tabs.Trigger value="history" class="rounded-none border-b-2 border-transparent data-active:border-primary px-6 py-3 bg-transparent data-active:bg-transparent">
						<div class="flex items-center gap-2">
							<History class="size-4" />
							<span>Riwayat Login</span>
						</div>
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="sessions">
					<Card.Root class="border-none shadow-sm ring-1 ring-border overflow-hidden">
						<Card.Content class="p-0">
							<Table.Root>
								<Table.Header class="bg-muted/30">
									<Table.Row>
										<Table.Head class="h-12 px-4">Perangkat</Table.Head>
										<Table.Head class="h-12 px-4">IP Address</Table.Head>
										<Table.Head class="h-12 px-4">Login Pada</Table.Head>
										<Table.Head class="h-12 px-4 text-right">Aksi</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if data.sessions.length === 0}
										<Table.Row>
											<Table.Cell colspan={4} class="py-12 text-center text-muted-foreground">
												Tidak ada sesi aktif.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each data.sessions as sess (sess.id)}
											{@const Icon = getDeviceIcon(sess.userAgent)}
											<Table.Row class="hover:bg-muted/20 transition-colors">
												<Table.Cell class="px-4">
													<div class="flex items-center gap-3">
														<div class="flex size-8 items-center justify-center rounded-full bg-muted shadow-inner">
															<Icon class="size-4 text-muted-foreground" />
														</div>
														<div class="flex flex-col max-w-[240px]">
															<span class="truncate text-xs font-medium text-foreground" title={sess.userAgent}>
																{sess.userAgent || 'Unknown Device'}
															</span>
														</div>
													</div>
												</Table.Cell>
												<Table.Cell class="px-4">
													<div class="flex items-center gap-2 text-xs font-mono text-muted-foreground">
														<Globe class="size-3" />
														{sess.ipAddress || 'Unknown'}
													</div>
												</Table.Cell>
												<Table.Cell class="px-4 text-xs text-muted-foreground">
													{formatDate(sess.createdAt)}
												</Table.Cell>
												<Table.Cell class="px-4 text-right">
													<Button
														variant="ghost"
														size="icon"
														class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
														title="Hapus Sesi"
														onclick={() => triggerRevoke(sess.token)}
													>
														<Trash2 class="size-4" />
													</Button>
												</Table.Cell>
											</Table.Row>
										{/each}
									{/if}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="history">
					<Card.Root class="border-none shadow-sm ring-1 ring-border overflow-hidden">
						<Card.Content class="p-0">
							<Table.Root>
								<Table.Header class="bg-muted/30">
									<Table.Row>
										<Table.Head class="h-12 px-4">Perangkat</Table.Head>
										<Table.Head class="h-12 px-4">IP Address</Table.Head>
										<Table.Head class="h-12 px-4">Waktu Login</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if data.loginHistory.length === 0}
										<Table.Row>
											<Table.Cell colspan={3} class="py-12 text-center text-muted-foreground">
												Belum ada riwayat login yang tercatat.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each data.loginHistory as log (log.id)}
											{@const Icon = getDeviceIcon(log.data?.userAgent)}
											<Table.Row class="hover:bg-muted/20 transition-colors">
												<Table.Cell class="px-4">
													<div class="flex items-center gap-3">
														<div class="flex size-8 items-center justify-center rounded-full bg-muted shadow-inner">
															<Icon class="size-4 text-muted-foreground" />
														</div>
														<span
															class="max-w-[280px] truncate text-xs font-medium text-foreground"
															title={log.data?.userAgent}
														>
															{log.data?.userAgent || 'Unknown Device'}
														</span>
													</div>
												</Table.Cell>
												<Table.Cell class="px-4 text-xs font-mono text-muted-foreground">
													{log.data?.ipAddress || 'Unknown'}
												</Table.Cell>
												<Table.Cell class="px-4 text-xs text-muted-foreground">
													{formatDate(log.createdAt)}
												</Table.Cell>
											</Table.Row>
										{/each}
									{/if}
								</Table.Body>
							</Table.Root>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>
</div>

<form
	id="revokeForm"
	action="?/revokeSession"
	method="POST"
	use:enhance={() => {
		isRevoking = true;
		return async ({ result, update }) => {
			isRevoking = false;
			revokeDialogOpen = false;
			await update();
		};
	}}
>
	<input type="hidden" name="token" value={selectedToken} />
</form>

<ConfirmationDialog
	bind:open={revokeDialogOpen}
	type="error"
	title="Konfirmasi Hapus Sesi"
	description="Apakah Anda yakin ingin menghapus sesi perangkat ini? Anda akan dipaksa keluar jika ini adalah sesi yang sedang digunakan."
	actionLabel="Ya, Hapus Sesi"
	loading={isRevoking}
	onAction={() => {
		const form = document.getElementById('revokeForm') as HTMLFormElement;
		form?.requestSubmit();
	}}
/>
