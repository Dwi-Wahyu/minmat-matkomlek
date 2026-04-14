<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Check, X, Info, Loader2 } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		open = $bindable(false),
		type = 'success',
		title = '',
		description = '',
		cancelLabel = 'Batal',
		actionLabel = 'Konfirmasi',
		loading = false,
		children,
		onAction = () => {},
		onCancel = () => {}
	}: {
		open?: boolean;
		type?: 'success' | 'error' | 'info';
		title?: string;
		description?: string;
		cancelLabel?: string;
		actionLabel?: string;
		loading?: boolean;
		children?: import('svelte').Snippet;
		onAction?: () => void;
		onCancel?: () => void;
	} = $props();

	const configs = {
		success: {
			color: 'text-success',
			bg: 'bg-success',
			fg: 'text-success-foreground',
			border: 'border-t-success',
			icon: Check
		},
		error: {
			color: 'text-destructive',
			bg: 'bg-destructive',
			fg: 'text-destructive-foreground',
			border: 'border-t-destructive',
			icon: X
		},
		info: {
			color: 'text-primary',
			bg: 'bg-primary',
			fg: 'text-primary-foreground',
			border: 'border-t-primary',
			icon: Info
		}
	};

	const config = $derived(configs[type]);
	const displayTitle = $derived(
		title || (type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info')
	);
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content
		class={cn('overflow-visible border-t-4 p-0 sm:max-w-[400px]', config.border)}
	>
		<div class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
			<div class={cn('rounded-full border-4 border-background p-3 shadow-xl', config.bg, config.fg)}>
				{#if config.icon}
					{@const Icon = config.icon}
					<Icon size={32} strokeWidth={3} />
				{/if}
			</div>
		</div>

		<div class="px-6 pt-12 pb-6 text-center">
			<AlertDialog.Header
				class="w-full place-items-center text-center sm:place-items-center sm:text-center"
			>
				<AlertDialog.Title class={cn('mb-2 w-full text-center text-2xl font-bold', config.color)}>
					{displayTitle}
				</AlertDialog.Title>
				<AlertDialog.Description class="text-center text-base text-muted-foreground">
					{description}
				</AlertDialog.Description>
			</AlertDialog.Header>

			{#if children}
				<div class="mt-4 text-left">
					{@render children()}
				</div>
			{/if}

			<AlertDialog.Footer class="mt-8 gap-2 sm:justify-center">
				<AlertDialog.Cancel class={buttonVariants({ variant: 'outline' })} onclick={onCancel}>
					{cancelLabel}
				</AlertDialog.Cancel>

				<AlertDialog.Action
					class={cn('min-w-[120px]', config.bg, config.fg, 'hover:opacity-90')}
					onclick={(e) => {
						e.preventDefault();
						onAction();
					}}
					disabled={loading}
				>
					{#if loading}
						<Loader2 class="mr-2 size-4 animate-spin" />
						Memproses...
					{:else}
						{actionLabel}
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</div>
	</AlertDialog.Content>
</AlertDialog.Root>
