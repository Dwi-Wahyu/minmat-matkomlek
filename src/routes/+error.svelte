<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Home, ArrowLeft, LogOut } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	const error = $derived(page.error);
	const status = $derived(page.status);
	const user = $derived(page.data.user);
	const orgSlug = $derived(page.data.org_slug);

	function goBack() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else {
			const target = orgSlug ? `/${orgSlug}/dashboard` : '/';
			goto(target);
		}
	}

	async function logout() {
		await authClient.signOut();
		window.location.href = '/';
	}
</script>

<div
	class="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 text-center dark:bg-slate-950"
>
	<div class="relative mb-8">
		<h1
			class="text-9xl font-black tracking-tighter text-slate-200 select-none md:text-[12rem] dark:text-slate-800"
		>
			{status || 404}
		</h1>
		<div class="absolute inset-0 flex items-center justify-center">
			<div class="space-y-2">
				<h2 class="text-2xl font-bold text-slate-900 md:text-3xl dark:text-slate-100">
					{status === 404 ? 'Halaman Tidak Ditemukan' : 'Terjadi Kesalahan'}
				</h2>
				<p class="mx-auto max-w-xs text-sm text-slate-500 md:text-base">
					{error?.message || 'Maaf, kami tidak dapat menemukan halaman yang Anda cari.'}
				</p>
			</div>
		</div>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-3">
		<Button variant="outline" size="lg" onclick={goBack} class="h-12 gap-2 px-6">
			<ArrowLeft class="size-4" />
			Kembali
		</Button>

		{#if user}
			<Button variant="destructive" size="lg" onclick={logout} class="h-12 gap-2 px-6">
				<LogOut class="size-4" />
				Keluar Sesi
			</Button>
		{:else}
			<Button href="/" size="lg" class="h-12 gap-2 px-6">
				<Home class="size-4" />
				Ke Beranda
			</Button>
		{/if}
	</div>

	<div class="mt-12 text-xs text-slate-400">
		&copy; {new Date().getFullYear()} Puskomlekad. All rights reserved.
	</div>
</div>
