<script lang="ts">
	import { enhance, applyAction } from '$app/forms';
	import type { ActionData } from './$types';
	import { toast } from 'svelte-sonner';

	let { form }: { form: ActionData } = $props();

	function handleSignIn() {
		return async ({ result }: { result: any }) => {
			if (result.type === 'redirect') {
				toast.success('Login Berhasil', {
					description: 'Selamat datang kembali di sistem MINMAT.'
				});
			} else if (result.type === 'failure') {
				toast.error('Login Gagal', {
					description: result.data?.message || 'Periksa kembali email dan password Anda.'
				});
			}

			// Menjalankan aksi bawaan SvelteKit (termasuk redirect)
			await applyAction(result);
		};
	}
</script>

<div class="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
	<div class="absolute inset-0 z-0 opacity-20">
		<div
			class="absolute inset-0 bg-[url('/backgrounds/login-background.png')] bg-cover bg-center"
		></div>
		<div class="absolute inset-0 bg-gradient-to-b from-primary/10 to-background"></div>
	</div>

	<div class="relative z-10 w-full max-w-[450px]">
		<div
			class="overflow-hidden rounded-2xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur-xl md:p-10"
		>
			<div class="mb-8 flex flex-col items-center text-center">
				<div class="mb-4 h-24 w-auto">
					<img
						src="/logo.svg"
						class="h-full w-auto drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
						alt="Cighra Apta Logo"
					/>
				</div>
				<h1 class="text-2xl font-extrabold tracking-wider text-foreground uppercase">
					Puskomlekad Office
				</h1>
				<p class="mt-1 text-xs font-medium tracking-[0.2em] text-primary uppercase">
					Minmat Matkomlek
				</p>
			</div>

			<form method="post" action="?/signIn" use:enhance={handleSignIn} class="space-y-5">
				<div class="space-y-2">
					<label for="username" class="text-sm font-semibold text-muted-foreground">
						Username
					</label>
					<div class="relative mt-1">
						<input
							id="username"
							name="username"
							type="text"
							placeholder="Masukkan username"
							class="w-full rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							required
						/>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<label for="password" class="text-sm font-semibold text-muted-foreground">
							Kata Sandi
						</label>
					</div>
					<div class="relative">
						<input
							type="password"
							id="password"
							name="password"
							placeholder="••••••••"
							class="w-full rounded-lg border border-input bg-muted/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							required
						/>
					</div>
				</div>

				<div class="flex items-center justify-between px-1">
					<label class="flex cursor-pointer items-center space-x-2">
						<input
							type="checkbox"
							class="rounded border-input bg-muted text-primary focus:ring-primary/20"
						/>
						<span class="text-xs text-muted-foreground">Ingat saya</span>
					</label>
					<a href="#forgot" class="text-xs font-medium text-primary hover:text-primary/80"
						>Lupa kata sandi?</a
					>
				</div>

				{#if form?.message}
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
						<p class="text-center text-xs font-medium text-destructive">{form.message}</p>
					</div>
				{/if}

				<button
					type="submit"
					class="w-full rounded-lg bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] active:scale-[0.98]"
				>
					Masuk
				</button>
			</form>

			<p
				class="mt-10 text-center text-[10px] font-medium tracking-widest text-muted-foreground uppercase"
			>
				&copy; 2026 PUSKOMLEKAD.
			</p>
		</div>
	</div>
</div>

<style>
	/* Custom focus ring untuk input */
	input:focus {
		box-shadow: 0 0 0 4px var(--ring);
	}
</style>
