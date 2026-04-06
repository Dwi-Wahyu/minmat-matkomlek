<script lang="ts">
	import { page } from '$app/state';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Component } from 'svelte';
	import { ChevronDown } from '@lucide/svelte';
	import { getSidebarState } from '$lib/components/ui/sidebar/context.svelte.ts';

	let { name, icon: Icon, children, activePrefix, isOpen, onToggle } = $props<{
		name: string;
		icon: Component;
		activePrefix: string;
		children: Array<{ name: string; path: string }>;
		isOpen: boolean;
		onToggle: (open: boolean) => void;
	}>();

	const sidebar = getSidebarState();

	let isGroupActive = $derived(page.url.pathname.startsWith(activePrefix));

	function handleToggle() {
		if (!sidebar.open) {
			sidebar.setOpen(true);
			onToggle(true);
		} else {
			onToggle(!isOpen);
		}
	}
</script>

<li>
	<button
		type="button"
		onclick={handleToggle}
		class="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/10
        {isGroupActive ? 'text-yellow-400' : 'opacity-80'}"
	>
		<div class="flex items-center gap-3 shrink-0">
			<Icon size={18} strokeWidth={2} class="opacity-70" />
			{#if sidebar.open}
				<span class="whitespace-nowrap transition-opacity duration-300">{name}</span>
			{/if}
		</div>
		
		{#if sidebar.open}
			<ChevronDown
				size={14}
				strokeWidth={2}
				class="transition-transform duration-300 {isOpen ? 'rotate-180' : ''}"
			/>
		{/if}
	</button>

	{#if isOpen && sidebar.open}
		<ul
			transition:slide={{ duration: 300, easing: cubicOut }}
			class="mt-1 ml-9 space-y-1 overflow-hidden border-l border-white/20 pl-2"
		>
			{#each children as child}
				{@const isChildActive = page.url.pathname === child.path}
				<li>
					<a
						href={child.path}
						class="block rounded-md px-3 py-2 text-xs font-medium transition-colors hover:bg-white/10
                        {isChildActive
							? 'font-bold text-yellow-400 opacity-100'
							: 'opacity-60 hover:opacity-100'}"
					>
						{child.name}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</li>
