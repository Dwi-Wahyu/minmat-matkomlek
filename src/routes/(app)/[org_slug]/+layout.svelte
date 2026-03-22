<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import NotificationBell from '$lib/components/NotificationBell.svelte';
	import { LogOut, Menu } from '@lucide/svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import { setSidebarState } from '$lib/components/ui/sidebar/context.svelte.ts';

	let { data, children } = $props();
	const sidebar = setSidebarState();

	const toTitleCase = (str: string) => {
		return str
			.toLowerCase()
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	const orgName = $derived(data.user.organization.name ?? '');
</script>

<div class="flex h-screen bg-[#F8F9FA]">
	<Sidebar user={data.user} />

	<main class="flex-1 overflow-y-auto">
		<header class="flex h-16 items-center justify-between bg-white/50 px-8 shadow transition-all duration-300">
			<div class="flex items-center gap-4">
				<button 
					onclick={() => sidebar.toggle()} 
					class="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
					title="Toggle Sidebar"
				>
					<Menu size={20} />
				</button>
				<h1>{toTitleCase(orgName)}</h1>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="/{data.user.organization.slug}/profil"
					class="flex items-center gap-3 transition-colors hover:text-primary"
				>
					<h4 class="rounded-full text-sm text-gray-800">
						{data.user.name}
					</h4>
					<Avatar.Root>
						<Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
						<Avatar.Fallback>CN</Avatar.Fallback>
					</Avatar.Root>
				</a>

				<a href="/logout" title="Logout" class="text-gray-500 hover:text-destructive">
					<LogOut size={20} />
				</a>

				<NotificationBell
					notifications={data.notifications}
					unreadCount={data.unreadCount}
					organizationId={data.user.organization.id}
				/>
			</div>
		</header>

		<div>
			{@render children()}
		</div>
	</main>
</div>
