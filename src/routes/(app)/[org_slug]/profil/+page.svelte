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
		Calendar,
		Monitor,
		Smartphone,
		Globe,
		Lock,
		Trash2,
		History
	} from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// State for session revocation dialog
	let revokeDialogOpen = $state(false);
	let selectedToken = $state('');
	let isRevoking = $state(false);

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

<div class="mx-auto max-w-5xl space-y-8 p-8">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">Profil Saya</h1>
		<p class="text-muted-foreground">Kelola informasi akun dan keamanan Anda.</p>
	</div>

	{#if form?.success}
		<div class="mb-4 rounded-xl border border-green-200 bg-green-100 px-4 py-3 text-green-700">
			{form.message}
		</div>
	{:else if form?.message}
		<div class="mb-4 rounded-xl border border-red-200 bg-red-100 px-4 py-3 text-red-700">
			{form.message}
		</div>
	{/if}

	<div class="grid gap-8 md:grid-cols-3">
		<!-- Profil User -->
		<Card.Root class="h-fit md:col-span-1">
			<Card.Header class="pb-2 text-center">
				<div
					class="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-muted"
				>
					{#if data.user.image}
						<img src={data.user.image} alt={data.user.name} class="h-full w-full object-cover" />
					{:else}
						<UserRound class="h-12 w-12 text-muted-foreground" />
					{/if}
				</div>
				<Card.Title>{data.user.name}</Card.Title>
				<Card.Description
					>{data.user.role.toUpperCase()} - {data.user.organization.name}</Card.Description
				>
			</Card.Header>
			<Card.Content class="space-y-4 border-t pt-4">
				<div class="space-y-1">
					<Label class="text-xs text-muted-foreground uppercase">Email</Label>
					<div class="flex items-center gap-2 text-sm">
						<Mail class="h-4 w-4 text-muted-foreground" />
						{data.user.email}
					</div>
				</div>
				<div class="space-y-1">
					<Label class="text-xs text-muted-foreground uppercase">Daftar Pada</Label>
					<div class="flex items-center gap-2 text-sm">
						<Calendar class="h-4 w-4 text-muted-foreground" />
						{formatDate(data.user.createdAt)}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Manajemen Sesi & Password -->
		<div class="space-y-8 md:col-span-2">
			<!-- Ubah Password -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center gap-2">
						<Lock class="h-5 w-5 text-primary" />
						<Card.Title>Ubah Password</Card.Title>
					</div>
					<Card.Description
						>Amankan akun Anda dengan mengganti password secara berkala.</Card.Description
					>
				</Card.Header>
				<Card.Content>
					<form action="?/changePassword" method="POST" use:enhance class="space-y-4">
						<div class="flex flex-col gap-4">
							<div class="space-y-2">
								<Label for="currentPassword">Password Saat Ini</Label>
								<Input
									id="currentPassword"
									name="currentPassword"
									type="password"
									placeholder="Masukkan password saat ini"
									required
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
								/>
							</div>
						</div>
						<Button type="submit" class="w-full">Update Password</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Sesi & Riwayat -->
			<Tabs.Root value="sessions">
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="sessions">Sesi Aktif</Tabs.Trigger>
					<Tabs.Trigger value="history">Riwayat Login</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="sessions">
					<Card.Root>
						<Card.Header>
							<div class="flex items-center gap-2">
								<Monitor class="h-5 w-5 text-primary" />
								<Card.Title>Sesi Aktif</Card.Title>
							</div>
							<Card.Description
								>Daftar perangkat yang saat ini masuk dengan akun Anda.</Card.Description
							>
						</Card.Header>
						<Card.Content class="p-0">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Perangkat</Table.Head>
										<Table.Head>IP Address</Table.Head>
										<Table.Head>Login Pada</Table.Head>
										<Table.Head class="text-right">Aksi</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if data.sessions.length === 0}
										<Table.Row>
											<Table.Cell colspan={4} class="py-10 text-center text-muted-foreground">
												Tidak ada sesi aktif.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each data.sessions as sess (sess.id)}
											{@const Icon = getDeviceIcon(sess.userAgent)}
											<Table.Row>
												<Table.Cell>
													<div class="flex items-center gap-3">
														<Icon class="h-5 w-5 text-muted-foreground" />
														<div class="flex flex-col">
															<span class="max-w-[200px] truncate text-xs" title={sess.userAgent}>
																{sess.userAgent || 'Unknown Device'}
															</span>
														</div>
													</div>
												</Table.Cell>
												<Table.Cell>
													<div class="flex items-center gap-2 text-xs">
														<Globe class="h-3 w-3" />
														{sess.ipAddress || 'Unknown'}
													</div>
												</Table.Cell>
												<Table.Cell class="text-xs">
													{formatDate(sess.createdAt)}
												</Table.Cell>
												<Table.Cell class="text-right">
													<Button
														variant="ghost"
														size="icon"
														class="text-destructive hover:bg-destructive/10"
														title="Hapus Sesi"
														onclick={() => triggerRevoke(sess.token)}
													>
														<Trash2 class="h-4 w-4" />
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
					<Card.Root>
						<Card.Header>
							<div class="flex items-center gap-2">
								<History class="h-5 w-5 text-primary" />
								<Card.Title>Riwayat Login Terakhir</Card.Title>
							</div>
							<Card.Description>Mencatat aktivitas login terbaru untuk akun Anda.</Card.Description>
						</Card.Header>
						<Card.Content class="p-0">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Perangkat</Table.Head>
										<Table.Head>IP Address</Table.Head>
										<Table.Head>Waktu Login</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if data.loginHistory.length === 0}
										<Table.Row>
											<Table.Cell colspan={3} class="py-10 text-center text-muted-foreground">
												Belum ada riwayat login yang tercatat.
											</Table.Cell>
										</Table.Row>
									{:else}
										{#each data.loginHistory as log (log.id)}
											{@const Icon = getDeviceIcon(log.data?.userAgent)}
											<Table.Row>
												<Table.Cell>
													<div class="flex items-center gap-3">
														<Icon class="h-5 w-5 text-muted-foreground" />
														<span
															class="max-w-[250px] truncate text-xs"
															title={log.data?.userAgent}
														>
															{log.data?.userAgent || 'Unknown Device'}
														</span>
													</div>
												</Table.Cell>
												<Table.Cell class="text-xs">
													{log.data?.ipAddress || 'Unknown'}
												</Table.Cell>
												<Table.Cell class="text-xs">
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
