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

<div
	class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 p-6 md:p-12"
>
	<div class="absolute inset-0 z-0 bg-[url('/backgrounds/login.png')] bg-cover bg-center">
		<div class="absolute inset-0 bg-black/10"></div>
	</div>

	<div class="absolute top-14 left-10 z-10 hidden text-[#2D6A4F] md:block">
		<h1 class="text-4xl font-black tracking-tight uppercase drop-shadow-sm">
			Selamat Datang di PUSKOMLEKAD
		</h1>
		<h4 class="text-lg font-semibold tracking-wide opacity-90">
			PUSAT KOMUNIKASI dan ELEKTRONIKA TNI AD
		</h4>
	</div>

	<div class="relative z-20 flex w-full max-w-7xl items-center justify-center md:justify-end">
		<div
			class="w-full max-w-lg rounded-[2.5rem] border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-md md:p-8"
		>
			<div class="mb-10 flex flex-col items-center text-center">
				<div
					class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 p-2 shadow-sm"
				>
					<img src="/logo-tni-ad.png" class="h-12 w-auto" alt="Logo TNI AD" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
					MINMAT MATKOMLEK
				</h1>
				<p class="mt-2 text-sm font-medium text-gray-500 italic">
					Administrasi Material Komunikasi dan Elektronika
				</p>
			</div>

			<form method="post" action="?/signIn" use:enhance={handleSignIn} class="space-y-6">
				<div class="space-y-1.5">
					<label
						for="username"
						class="ml-1 block text-xs font-bold tracking-wider text-gray-400 uppercase"
					>
						Username
					</label>
					<input
						id="username"
						name="username"
						placeholder="Jonathan_Reichert07"
						class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
						required
					/>
				</div>

				<div class="space-y-1.5">
					<div class="flex items-center justify-between">
						<label
							for="password"
							class="ml-1 block text-xs font-bold tracking-wider text-gray-400 uppercase"
						>
							Password
						</label>
					</div>
					<input
						type="password"
						id="password"
						name="password"
						placeholder="••••••••••••"
						class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3.5 text-gray-900 transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none"
						required
					/>
				</div>

				{#if form?.message}
					<div class="rounded-lg border border-red-100 bg-red-50 p-3">
						<p class="text-center text-sm font-medium text-red-600">{form.message}</p>
					</div>
				{/if}

				<button
					type="submit"
					class="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-[#2D3436] py-4 font-bold text-white transition-all hover:bg-black active:scale-[0.98]"
				>
					<span class="relative z-10">Sign In</span>
					<div
						class="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full"
					></div>
				</button>
			</form>

			<p class="mt-8 text-center text-xs text-gray-400">
				&copy; 2026 PUSKOMLEKAD. All rights reserved.
			</p>
		</div>
	</div>
</div>
