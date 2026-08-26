<script lang="ts">
	import type { PageData } from './$types';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { UserRound, Settings2, ShieldCheck, Mail } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="mx-auto max-w-7xl space-y-6 p-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
			<p class="text-muted-foreground">
				Kelola semua pengguna dalam organisasi {data.user.organization.name}.
			</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Daftar Anggota</Card.Title>
			<Card.Description>Daftar semua pengguna yang aktif di organisasi ini.</Card.Description>
		</Card.Header>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nama</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Login Terakhir</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.members.length === 0}
						<Table.Row>
							<Table.Cell colspan={4} class="py-10 text-center text-muted-foreground">
								Belum ada pengguna di organisasi ini.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.members as member (member.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div
											class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-muted"
										>
											{#if member.user!.image}
												<img
													src={member.user!.image}
													alt={member.user!.name}
													class="h-full w-full object-cover"
												/>
											{:else}
												<UserRound class="h-5 w-5 text-muted-foreground" />
											{/if}
										</div>
										<span class="font-medium">{member.user!.name}</span>
									</div>
								</Table.Cell>

								<Table.Cell>
									<div class="flex items-center gap-2 font-bold tracking-wider uppercase">
										<Badge variant="secondary" class="text-[10px]">{member.role}</Badge>
									</div>
								</Table.Cell>

								<Table.Cell>
									<div class="text-sm text-muted-foreground">
										{member.lastLogin
											? new Date(member.lastLogin).toLocaleString('id-ID', {
													day: 'numeric',
													month: 'long',
													year: 'numeric',
													hour: '2-digit',
													minute: '2-digit'
												})
											: 'Belum pernah login'}
									</div>
								</Table.Cell>

								<Table.Cell class="text-right">
									<Button
										variant="outline"
										size="sm"
										href="/{data.orgSlug}/pengaturan/pengguna/{member.user!.id}"
										class="gap-2"
									>
										<Settings2 class="h-4 w-4" />
										Pengaturan
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
