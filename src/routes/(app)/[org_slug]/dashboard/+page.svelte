<script lang="ts">
	import type { PageData } from './$types';
	import DashboardOperator from '$lib/components/DashboardOperator.svelte';
	import DashboardPimpinan from '$lib/components/DashboardPimpinan.svelte';
	import DashboardKepalaGudang from '$lib/components/DashboardKepalaGudang.svelte';
	import ReturnReminderDialog from '$lib/components/ReturnReminderDialog.svelte';

	let { data }: { data: PageData } = $props();

	const isOperator = $derived(data.isOperator ?? false);
	const operatorDashboard = $derived(data.operatorDashboard);
	const isKepalaGudang = $derived(data.isKepalaGudang ?? false);

	let reminderOpen = $state(false);
	let hasOpened = $state(false);

	$effect(() => {
		if (data.returnReminders && data.returnReminders.length > 0 && data.isSatuanBawahan) {
			const dismissedKey = `return-reminder-dismissed-${data.org_slug}`;
			if (!sessionStorage.getItem(dismissedKey)) {
				reminderOpen = true;
				hasOpened = true;
			}
		}
	});

	$effect(() => {
		if (hasOpened && !reminderOpen) {
			sessionStorage.setItem(`return-reminder-dismissed-${data.org_slug}`, '1');
		}
	});
</script>

<div class="space-y-4 p-4 text-foreground md:space-y-6 md:p-6">
	{#if data.returnReminders && data.returnReminders.length > 0}
		<ReturnReminderDialog
			bind:open={reminderOpen}
			reminders={data.returnReminders}
			orgSlug={data.org_slug}
		/>
	{/if}

	{#if isOperator && operatorDashboard}
		<DashboardOperator org_slug={data.org_slug} {operatorDashboard} />
	{:else if isKepalaGudang}
		{#await data.kgDashboardPromise}
			<!-- Skeleton saat dashboard kepala gudang sedang dimuat -->
			<div class="flex items-center gap-4">
				<div class="h-14 w-14 animate-pulse rounded-2xl bg-muted"></div>
				<div class="space-y-2">
					<div class="h-5 w-48 animate-pulse rounded bg-muted"></div>
					<div class="h-3 w-72 animate-pulse rounded bg-muted"></div>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each Array(4) as _}
					<div
						class="flex animate-pulse items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
					>
						<div class="h-12 w-12 rounded-xl bg-muted"></div>
						<div class="space-y-2">
							<div class="h-3 w-24 rounded bg-muted"></div>
							<div class="h-7 w-16 rounded bg-muted"></div>
						</div>
					</div>
				{/each}
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<div class="space-y-8 lg:col-span-2">
					<div class="h-40 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
					<div class="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
				</div>
				<div class="space-y-8">
					<div class="h-56 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
					<div class="h-48 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
				</div>
			</div>
		{:then kgData}
			{#if kgData}
				<DashboardKepalaGudang
					data={kgData as any}
					org_slug={data.org_slug}
					returnReminders={data.returnReminders}
				/>
			{/if}
		{:catch err}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive"
			>
				Gagal memuat data dashboard: {err.message}
			</div>
		{/await}
	{:else}
		{#await data.dashboardDataPromise}
			<!-- Skeleton saat filter berubah dan data baru sedang dimuat -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="h-9 w-72 animate-pulse rounded-xl bg-muted"></div>
				<div class="h-9 w-56 animate-pulse rounded-xl bg-muted"></div>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{#each Array(4) as _}
					<div
						class="flex animate-pulse items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
					>
						<div class="h-12 w-12 rounded-xl bg-muted"></div>
						<div class="space-y-2">
							<div class="h-3 w-24 rounded bg-muted"></div>
							<div class="h-7 w-16 rounded bg-muted"></div>
						</div>
					</div>
				{/each}
			</div>

			<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
				<div class="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-2">
					{#each Array(3) as _}
						<div
							class="h-48 animate-pulse rounded-2xl border border-border bg-card shadow-sm"
						></div>
					{/each}
					<div
						class="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-sm md:col-span-3"
					></div>
				</div>
				<div class="space-y-8">
					<div class="h-48 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
					<div class="h-72 animate-pulse rounded-2xl border border-border bg-card shadow-sm"></div>
				</div>
			</div>
		{:then dashboardData}
			{#if dashboardData && data.activeFilters}
				<DashboardPimpinan
					data={dashboardData as any}
					activeFilters={data.activeFilters as any}
					userRole={data.user?.role ?? ''}
					org_slug={data.org_slug}
				/>
			{/if}
		{:catch err}
			<div
				class="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm text-destructive"
			>
				Gagal memuat data dashboard: {err.message}
			</div>
		{/await}
	{/if}
</div>
