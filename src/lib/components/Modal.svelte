<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	// Menggunakan $bindable agar status 'show' bisa diubah dari dalam (saat klik close)
	let {
		show = $bindable(false),
		title = 'Judul Modal',
		description = 'Deskripsi konten modal di sini.'
	} = $props<{
		show: boolean;
		title?: string;
		description?: string;
	}>();

	function close() {
		show = false;
	}
</script>

{#if show}
	<div
		transition:fade={{ duration: 200 }}
		onclick={close}
		class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
	>
		<div
			transition:fly={{ y: 20, duration: 400, easing: cubicOut }}
			onclick={(e) => e.stopPropagation()}
			class="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
		>
			<div class="border-b border-border p-6">
				<h3 class="text-xl font-bold text-foreground">{title}</h3>
			</div>

			<div class="p-6 text-muted-foreground">
				<p>{description}</p>
			</div>

			<div class="flex justify-end gap-3 bg-muted/50 p-4">
				<button
					onclick={close}
					class="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
				>
					Batal
				</button>
				<button
					onclick={close}
					class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
				>
					Konfirmasi
				</button>
			</div>
		</div>
	</div>
{/if}
