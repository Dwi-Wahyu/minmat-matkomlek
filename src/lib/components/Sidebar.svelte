<script lang="ts">
	const { user } = $props();

	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';

	function getPath(path: string) {
		const { organization } = user;

		if (!organization.parentId) {
			return path;
		}

		return `/${organization.slug + path}`;
	}

	const menus = [
		{
			name: 'Dashboard',
			path: getPath('/dashboard'),
			icon: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Stock Gudang',
			icon: '<path d="M21 8l-9-4-9 4 9 4 9-4zM3 12l9 4 9-4M3 16l9 4 9-4"/>',
			isDropdown: true,
			path: getPath('/gudang'),
			children: [
				{ name: 'Komunity', path: getPath('/gudang/komunity') },
				{ name: 'Transito', path: getPath('/gudang/transito') },
				{ name: 'Balkir', path: getPath('/gudang/balkir') }
			]
		},
		{
			name: 'Barang Habis Pakai',
			path: getPath('/barang'),
			icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'LAP BTK - 16',
			path: getPath('/laporan/btk16'),
			icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Data Alkomlek',
			path: getPath('/alat/alkomlek'),
			icon: '<path d="M12 20h.01M7 16.31V16.3a5 5 0 0 1 10 0v.01M5 12.18a9 9 0 0 1 14 0M3 8.1a13 13 0 0 1 18 0"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Data Alpernika & Lek',
			path: getPath('/alat/pernika_lek'),
			icon: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h10"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Pemeliharaan',
			path: getPath('/pemeliharaan'),
			icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Peminjaman',
			path: getPath('/peminjaman'),
			icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Satuan Jajaran',
			path: getPath('/satuan-jajaran'),
			icon: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 20 20"/>',
			isDropdown: false,
			children: []
		},
		{
			name: 'Konversi Unit',
			path: getPath('/konversi-unit'),
			icon: '<path d="m12 19 7-7 3 3-7 7-3-3z"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="m2 2 20 20"/>',
			isDropdown: false,
			children: []
		}
	];
</script>

<aside class="flex h-screen w-64 flex-col overflow-hidden bg-[#2D5A43] text-white shadow-xl">
	<div class="p-6">
		<div class="flex items-center gap-3">
			<img src="/logo-tni-ad.png" width="35" height="35" alt="" />

			<div>
				<h1 class="text-sm leading-tight font-bold tracking-wider text-yellow-400">MINMAT</h1>
				<p class="text-[10px] font-medium tracking-tighter uppercase opacity-80">MATKOMLEK</p>
			</div>
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto px-4">
		<p class="mb-4 px-3 text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Menu Utama</p>
		<ul class="space-y-1">
			{#each menus as menu}
				{#if menu.isDropdown}
					<SidebarDropdown
						name={menu.name}
						icon={menu.icon}
						activePrefix={menu.path}
						children={menu.children}
					/>
				{:else}
					<SidebarLink href={menu.path} icon={menu.icon} name={menu.name} />
				{/if}
			{/each}
		</ul>
	</nav>
</aside>
