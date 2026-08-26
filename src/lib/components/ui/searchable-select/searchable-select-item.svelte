<script lang="ts">
	import { Select as SelectPrimitive } from 'bits-ui';
	import { cn, type WithoutChild } from '$lib/utils.js';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { getContext } from 'svelte';

	let {
		ref = $bindable(null),
		class: className,
		value,
		label,
		disabled = false,
		children: childrenProp,
		...restProps
	}: WithoutChild<SelectPrimitive.ItemProps> = $props();

	const searchState = getContext<{ searchValue: string } | undefined>(
		'SEARCHABLE_SELECT_SEARCH_STATE'
	);

	const isVisible = $derived.by(() => {
		if (!searchState?.searchValue) return true;
		const search = searchState.searchValue.toLowerCase();
		const l = (label || '').toLowerCase();
		const v = String(value).toLowerCase();
		return l.includes(search) || v.includes(search);
	});
</script>

{#if isVisible}
	<SelectPrimitive.Item
		bind:ref
		{value}
		{disabled}
		data-slot="select-item"
		class={cn(
			"relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
			className
		)}
		{...restProps}
	>
		{#snippet children({ selected, highlighted })}
			<span class="absolute inset-e-2 flex size-3.5 items-center justify-center">
				{#if selected}
					<CheckIcon class="size-4" />
				{/if}
			</span>
			{#if childrenProp}
				{@render childrenProp({ selected, highlighted })}
			{:else}
				{label || value}
			{/if}
		{/snippet}
	</SelectPrimitive.Item>
{/if}
