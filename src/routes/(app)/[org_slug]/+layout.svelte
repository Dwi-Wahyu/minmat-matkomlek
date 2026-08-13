<script lang="ts">
	import type { LayoutData } from './$types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import ConfirmationDialog from '$lib/components/ConfirmationDialog.svelte';
	import { LogOut, Menu, User } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { goto } from '$app/navigation';
	import * as Button from '$lib/components/ui/button/index.js';
	import { setSidebarState } from '@/components/ui/sidebar/context.svelte.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { BookText } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
	const sidebar = setSidebarState();

	let isLogoutDialogOpen = $state(false);

	const toTitleCase = (str: string) => {
		// Langsung kembalikan nama jika ada display name
		if (data.user.organization.displayName) {
			return data.user.organization.displayName;
		}

		return str
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const orgName = $derived(data.user.organization.displayName || data.user.organization.name || '');

	function handleLogout() {
		goto(resolve('/logout'));
	}
</script>

<div class="flex h-screen overflow-hidden bg-background">
	<Sidebar user={data.user} />

	<main class="flex flex-1 flex-col overflow-hidden">
		<header
			class="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-4 shadow transition-all duration-300 md:px-6"
		>
			<div class="flex items-center gap-4">
				<button
					onclick={() => sidebar.toggle()}
					class="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
					title="Toggle Sidebar"
				>
					<Menu size={20} />
				</button>
				<h1 class="hidden text-foreground md:block">{toTitleCase(orgName)}</h1>
			</div>

			<div class="flex items-center gap-3">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger class="flex items-center gap-3 outline-none">
						<div class="hidden flex-col items-end md:flex">
							<span class="text-sm font-medium text-foreground">{data.user.name}</span>
							<span class="text-xs text-muted-foreground">{data.user.role}</span>
						</div>
						<Avatar.Root class="h-9 w-9 border border-border">
							<Avatar.Image src="/uploads/avatar/default.png" alt="Profile" />
							<Avatar.Fallback>{data.user.name.charAt(0)}</Avatar.Fallback>
						</Avatar.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Akun Saya</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Group>
							<DropdownMenu.Item>
								<a
									href={resolve(`/(app)/[org_slug]/profil`, {
										org_slug: data.user.organization.slug
									})}
									class="flex w-full items-center gap-2"
								>
									<User class="h-4 w-4" />
									<span>Profil</span>
								</a>
							</DropdownMenu.Item>
						</DropdownMenu.Group>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={() => (isLogoutDialogOpen = true)} variant="destructive">
							<LogOut />
							<span>Keluar</span>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<NotificationBell
					notifications={data.notifications}
					unreadCount={data.unreadCount}
					organizationId={data.user.organization.id}
					orgSlug={data.user.organization.slug}
				/>
			</div>
		</header>

		<div class="flex-1 overflow-y-auto">
			<div class="mx-auto w-full max-w-7xl">
				{@render children()}
			</div>
		</div>
	</main>
</div>

<ConfirmationDialog
	bind:open={isLogoutDialogOpen}
	type="info"
	title="Konfirmasi Keluar"
	description="Apakah Anda yakin ingin keluar dari sistem? Anda akan diminta login kembali untuk mengakses data."
	actionLabel="Keluar"
	cancelLabel="Batal"
	onAction={handleLogout}
/>
