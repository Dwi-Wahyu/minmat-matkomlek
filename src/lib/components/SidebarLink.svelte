<script lang="ts">
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import { getSidebarState } from '$lib/components/ui/sidebar/context.svelte.ts';

	let { href, icon: Icon, name } = $props<{
		href: string;
		icon: Component;
		name: string;
	}>();

	const sidebar = getSidebarState();

	// Cek status aktif secara reaktif
	let isActive = $derived(page.url.pathname === href || page.url.pathname.startsWith(href + '/'));
</script>

<li>
	<a
		{href}
		class="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
        {isActive
			? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
			: 'opacity-80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:opacity-100'}
		{sidebar.open ? 'gap-3' : 'justify-center'}"
		title={!sidebar.open ? name : ''}
	>
		<Icon size={18} strokeWidth={2} class="opacity-70 shrink-0" />
		{#if sidebar.open}
			<span class="whitespace-nowrap transition-opacity duration-300">{name}</span>
		{/if}
	</a>
</li>
