<script lang="ts">
	import { Bell, Check, Trash2, X, Calendar, Clock, Inbox } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';

	let { data } = $props();

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

	function formatDate(date: Date | string | number) {
		return new Date(date).toLocaleDateString('id-ID', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function markAsRead(id: string) {
		const res = await fetch('/api/notifications', {
			method: 'PATCH',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) invalidateAll();
	}

	async function clearNotification(id: string) {
		if (!confirm('Hapus notifikasi ini?')) return;
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) invalidateAll();
	}

	async function clearAll() {
		if (!confirm('Hapus semua notifikasi Anda?')) return;
		const res = await fetch('/api/notifications', {
			method: 'DELETE',
			body: JSON.stringify({ clearAll: true, organizationId: data.user.organization.id }),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) invalidateAll();
	}

	const priorityColors = {
		LOW: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
		MEDIUM: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
		HIGH: 'bg-red-100 text-red-700 hover:bg-red-100'
	};
</script>

<div class="p-8 max-w-4xl mx-auto">
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Semua Notifikasi</h1>
			<p class="text-muted-foreground">Kelola semua pemberitahuan sistem dan aktivitas Anda.</p>
		</div>
		{#if data.notifications.length > 0}
			<Button variant="outline" size="sm" class="text-destructive hover:bg-destructive/10" onclick={clearAll}>
				<Trash2 class="mr-2 h-4 w-4" />
				Hapus Semua
			</Button>
		{/if}
	</div>

	{#if data.notifications.length === 0}
		<Card.Root class="flex flex-col items-center justify-center py-20 text-center border-dashed">
			<div class="rounded-full bg-muted p-6 mb-4">
				<Inbox class="h-10 w-10 text-muted-foreground/40" />
			</div>
			<Card.Title>Tidak ada notifikasi</Card.Title>
			<Card.Description class="mt-2 max-w-xs">
				Anda belum memiliki notifikasi saat ini. Pemberitahuan baru akan muncul di sini.
			</Card.Description>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.notifications as notif (notif.id)}
				<Card.Root class={cn(
					"transition-all duration-200 border-l-4",
					!notif.read ? "bg-primary/5 border-l-primary shadow-sm" : "border-l-transparent bg-white"
				)}>
					<Card.Content class="p-6">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1 flex-1">
								<div class="flex items-center gap-2 mb-2">
									<Badge class={cn("text-[10px] uppercase font-bold px-2 py-0", priorityColors[notif.priority])}>
										{notif.priority}
									</Badge>
									<div class="flex items-center text-xs text-muted-foreground gap-1">
										<Clock class="h-3 w-3" />
										{formatRelativeTime(notif.createdAt)}
									</div>
									<div class="flex items-center text-xs text-muted-foreground gap-1 ml-2 border-l pl-2">
										<Calendar class="h-3 w-3" />
										{formatDate(notif.createdAt)}
									</div>
								</div>
								
								<h3 class={cn("text-lg font-bold leading-tight", !notif.read ? "text-foreground" : "text-foreground/80")}>
									{notif.title}
								</h3>
								
								<p class="text-muted-foreground text-sm leading-relaxed">
									{notif.body}
								</p>

								{#if notif.action?.webPath}
									<div class="pt-3">
										<Button 
											href={notif.action.webPath} 
											variant="secondary" 
											size="sm" 
											class="h-8 text-xs"
											onclick={() => !notif.read && markAsRead(notif.id)}
										>
											Lihat Detail Transaksi
										</Button>
									</div>
								{/if}
							</div>

							<div class="flex flex-col gap-2">
								{#if !notif.read}
									<Button 
										variant="ghost" 
										size="icon" 
										class="h-8 w-8 text-primary hover:bg-primary/10" 
										onclick={() => markAsRead(notif.id)}
										title="Tandai sudah baca"
									>
										<Check class="h-4 w-4" />
									</Button>
								{/if}
								<Button 
									variant="ghost" 
									size="icon" 
									class="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" 
									onclick={() => clearNotification(notif.id)}
									title="Hapus"
								>
									<X class="h-4 w-4" />
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
