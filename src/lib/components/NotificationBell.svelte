<script lang="ts">
	import { Bell, Check, X } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';

	type NotificationAction = {
		type?: string;
		resourceId?: string;
		webPath?: string;
		mobilePath?: string;
	};

	type Notification = {
		id: string;
		title: string;
		body: string;
		priority: 'LOW' | 'MEDIUM' | 'HIGH';
		read: boolean;
		createdAt: Date | string;
		action?: NotificationAction | null;
	};

	let { notifications = [] as Notification[], unreadCount = 0, organizationId = '' } = $props();

	function formatRelativeTime(date: Date | string | number) {
		const now = new Date().getTime();
		const diff = now - new Date(date).getTime();

		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days} hari yang lalu`;
		if (hours > 0) return `${hours} jam yang lalu`;
		if (minutes > 0) return `${minutes} menit yang lalu`;
		return 'Baru saja';
	}

	async function markAsRead(id: string) {
		const res = await fetch('/api/notifications', {
			method: 'PATCH',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	async function clearNotification(id: string) {
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	async function clearAll() {
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ clearAll: true, organizationId }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			invalidateAll();
		}
	}

	const priorityColors = {
		LOW: 'bg-primary/10 text-primary',
		MEDIUM: 'bg-warning/10 text-warning',
		HIGH: 'bg-destructive/10 text-destructive'
	};
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				variant="ghost"
				size="icon"
				class="relative h-10 w-10 rounded-full"
				{...props}
			>
				<Bell class="h-5 w-5" />
				{#if unreadCount > 0}
					<span
						class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
					>
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				{/if}
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-80 p-0 overflow-hidden">
		<div class="flex items-center justify-between border-b p-4">
			<h3 class="text-sm font-semibold">Notifikasi</h3>
			{#if notifications.length > 0}
				<Button
					variant="ghost"
					size="sm"
					class="h-auto p-0 text-xs text-primary hover:bg-transparent"
					onclick={clearAll}
				>
					Hapus Semua
				</Button>
			{/if}
		</div>

		<div class="max-h-[400px] overflow-y-auto">
			{#if notifications.length === 0}
				<div class="flex flex-col items-center justify-center px-4 py-10 text-center">
					<div class="mb-2 rounded-full bg-muted p-3">
						<Bell class="h-6 w-6 text-muted-foreground opacity-20" />
					</div>
					<p class="text-sm font-medium text-muted-foreground">Tidak ada notifikasi</p>
					<p class="mt-1 text-xs text-muted-foreground/60">
						Semua notifikasi baru akan muncul di sini
					</p>
				</div>
			{:else}
				{#each notifications as notif (notif.id)}
					<div
						class={cn(
							'relative flex flex-col gap-1 border-b p-4 transition-colors last:border-0 hover:bg-muted/50',
							!notif.read && 'bg-primary/5'
						)}
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex flex-col gap-1 overflow-hidden">
								<div class="flex items-center gap-2">
									<span
										class={cn(
											'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium',
											priorityColors[notif.priority]
										)}
									>
										{notif.priority}
									</span>
									<span class="truncate text-xs text-muted-foreground">
										{formatRelativeTime(notif.createdAt)}
									</span>
								</div>
								<h4 class="truncate text-sm leading-tight font-semibold text-foreground">
									{notif.title}
								</h4>
							</div>
							<div class="flex items-center">
								{#if !notif.read}
									<button
										class="rounded-full p-1 text-primary transition-colors hover:bg-primary/10"
										title="Tandai sudah baca"
										onclick={() => markAsRead(notif.id)}
									>
										<Check class="h-3.5 w-3.5" />
									</button>
								{/if}
								<button
									class="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
									title="Hapus"
									onclick={() => clearNotification(notif.id)}
								>
									<X class="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
						<p class="line-clamp-2 text-sm text-muted-foreground">
							{notif.body}
						</p>

						{#if notif.action?.webPath}
							<a
								href={notif.action.webPath}
								class="mt-2 text-xs font-medium text-primary hover:underline"
								onclick={() => !notif.read && markAsRead(notif.id)}
							>
								Lihat Detail
							</a>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		{#if notifications.length > 0}
			<div class="border-top bg-muted/20 p-2">
				<Button
					variant="ghost"
					class="h-8 w-full text-xs font-medium"
					size="sm"
					href="/{organizationId}/notifikasi"
				>
					Tampilkan Semua
				</Button>
			</div>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
