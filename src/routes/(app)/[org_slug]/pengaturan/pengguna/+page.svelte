<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { UserRound, Settings2, ShieldCheck, Mail } from '@lucide/svelte';

	let { data } = $props();
</script>

<div class="p-8 max-w-7xl mx-auto space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
			<p class="text-muted-foreground">Kelola semua pengguna dalam organisasi {data.user.organization.name}.</p>
		</div>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Daftar Anggota</Card.Title>
			<Card.Description>Daftar semua pengguna yang aktif di organisasi ini.</Card.Description>
		</Card.Header>
		<Card.Content>
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nama</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Aksi</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.members.length === 0}
						<Table.Row>
							<Table.Cell colspan={5} class="text-center py-10 text-muted-foreground">
								Belum ada pengguna di organisasi ini.
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each data.members as member (member.id)}
							<Table.Row>
								<Table.Cell>
									<div class="flex items-center gap-3">
										<div class="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
											{#if member.user.image}
												<img src={member.user.image} alt={member.user.name} class="h-full w-full object-cover" />
											{:else}
												<UserRound class="h-5 w-5 text-muted-foreground" />
											{/if}
										</div>
										<span class="font-medium">{member.user.name}</span>
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2 text-muted-foreground">
										<Mail class="h-4 w-4" />
										{member.user.email}
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2 uppercase tracking-wider font-bold">
										<ShieldCheck class="h-4 w-4 text-primary" />
										<Badge variant="secondary" class="text-[10px]">{member.role}</Badge>
									</div>
								</Table.Cell>
								<Table.Cell>
									{#if member.user.emailVerified}
										<Badge variant="outline" class="bg-green-100 text-green-700 border-green-200">Terverifikasi</Badge>
									{:else}
										<Badge variant="outline" class="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button 
										variant="ghost" 
										size="sm" 
										href="/{data.orgSlug}/pengaturan/pengguna/{member.user.id}"
										class="gap-2"
									>
										<Settings2 class="h-4 w-4" />
										Detail & Pengaturan
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
