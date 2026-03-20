<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { LogOut } from '@lucide/svelte';

	let { data, children } = $props();

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
		<header class="flex h-16 items-center justify-between bg-white/50 px-8 shadow">
			<h1>{toTitleCase(orgName)}</h1>

			<div class="flex items-center gap-3">
				<h4 class="rounded-full text-sm text-gray-800">
					{data.user.name}
				</h4>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-circle-user-round-icon lucide-circle-user-round"
					><path d="M18 20a6 6 0 0 0-12 0" /><circle cx="12" cy="10" r="4" /><circle
						cx="12"
						cy="12"
						r="10"
					/></svg
				>
				<a href="/logout">
					<LogOut />
				</a>
			</div>
		</header>

		<div class="p-8">
			{@render children()}
		</div>
	</main>
</div>
