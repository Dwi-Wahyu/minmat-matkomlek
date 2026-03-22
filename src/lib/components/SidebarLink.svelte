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
			? 'bg-white/20 text-yellow-400 shadow-sm'
			: 'opacity-80 hover:bg-white/10 hover:opacity-100'}
		{sidebar.open ? 'gap-3' : 'justify-center'}"
		title={!sidebar.open ? name : ''}
	>
		<Icon size={18} strokeWidth={2} class="opacity-70 shrink-0" />
		{#if sidebar.open}
			<span class="whitespace-nowrap transition-opacity duration-300">{name}</span>
		{/if}
	</a>
</li>
