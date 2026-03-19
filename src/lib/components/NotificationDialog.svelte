<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Check, X, Info } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	// Svelte 5 Props dengan Rune $props dan $bindable
	let {
		open = $bindable(false),
		type = 'success',
		title = '',
		description = '',
		actionLabel = 'Continue',
		onAction = () => {}
	}: {
		open?: boolean;
		type?: 'success' | 'error' | 'info';
		title?: string;
		description?: string;
		actionLabel?: string;
		onAction?: () => void;
	} = $props();

	// Konfigurasi style
	const configs = {
		success: {
			color: 'text-green-500',
			bg: 'bg-green-500',
			border: 'border-t-green-500',
			icon: Check
		},
		error: {
			color: 'text-red-500',
			bg: 'bg-red-500',
			border: 'border-t-red-500',
			icon: X
		},
		info: {
			color: 'text-blue-500',
			bg: 'bg-blue-500',
			border: 'border-t-blue-500',
			icon: Info
		}
	};

	// Menggunakan $derived sebagai pengganti reactive declaration $:
	const config = $derived(configs[type]);
	const displayTitle = $derived(
		title || (type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info')
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class={cn('overflow-visible border-t-4 p-0 sm:max-w-[400px]', config.border)}>
		<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
			<div class={cn('rounded-full border-4 border-white p-3 text-white shadow-lg', config.bg)}>
				{#if config.icon}
					{@const Icon = config.icon}
					<Icon size={32} strokeWidth={3} />
				{/if}
			</div>
		</div>

		<div class="px-6 pt-12 pb-6 text-center">
			<Dialog.Header>
				<Dialog.Title class={cn('mb-2 text-center text-2xl font-bold', config.color)}>
					{displayTitle}
				</Dialog.Title>
				<Dialog.Description class="text-center text-base text-muted-foreground">
					{description}
				</Dialog.Description>
			</Dialog.Header>

			<div class="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
				<Dialog.Close class={buttonVariants({ variant: 'outline' })}>
					Continue shopping
				</Dialog.Close>
				<Button class={cn('min-w-[120px]', config.bg, 'hover:opacity-90')} onclick={onAction}>
					{actionLabel}
				</Button>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
