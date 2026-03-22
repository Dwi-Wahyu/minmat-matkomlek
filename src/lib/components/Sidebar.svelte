<script lang="ts">
	import {
		LayoutDashboard,
		Warehouse,
		Package,
		FileText,
		Radio,
		Zap,
		Wrench,
		Handshake,
		Building2,
		RefreshCcw,
		Settings
	} from '@lucide/svelte';
	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';
	import { getSidebarState } from './ui/sidebar/context.svelte';

	const { user } = $props();
	const sidebar = getSidebarState();

	function getPath(path: string) {
		const { organization } = user;
		return `/${organization.slug + path}`;
	}

	const menus = [
		{
			name: 'Dashboard',
			path: getPath('/dashboard'),
			icon: LayoutDashboard,
			isDropdown: false,
			children: []
		},
		{
			name: 'Stock Gudang',
			icon: Warehouse,
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
			icon: Package,
			isDropdown: true,
			path: getPath('/barang'),
			children: [
				{ name: 'Daftar Barang Habis Pakai', path: getPath('/barang') },
				{ name: 'Input Barang Habis Pakai Baru', path: getPath('/barang/create') }
			]
		},
		{
			name: 'LAP BTK - 16',
			path: getPath('/laporan/btk16'),
			icon: FileText,
			isDropdown: false,
			children: []
		},
		{
			name: 'Data Alkomlek',
			icon: Radio,
			isDropdown: true,
			path: getPath('/alat/alkomlek'),
			children: [
				{ name: 'Daftar Alkomlek', path: getPath('/alat/alkomlek') },
				{ name: 'Input Alkomlek Baru', path: getPath('/alat/alkomlek/create') }
			]
		},
		{
			name: 'Data Alpernika & Lek',
			icon: Zap,
			isDropdown: true,
			path: getPath('/alat/alpernika'),
			children: [
				{ name: 'Daftar Alpernika & Lek', path: getPath('/alat/alpernika') },
				{ name: 'Input Pernika & Lek Baru', path: getPath('/alat/alpernika/create') }
			]
		},
		{
			name: 'Pemeliharaan',
			path: getPath('/pemeliharaan'),
			icon: Wrench,
			isDropdown: false,
			children: []
		},
		{
			name: 'Peminjaman',
			path: getPath('/peminjaman'),
			icon: Handshake,
			isDropdown: false,
			children: []
		},
		{
			name: 'Satuan Jajaran',
			path: getPath('/satuan-jajaran'),
			icon: Building2,
			isDropdown: false,
			children: []
		},
		{
			name: 'Konversi Unit',
			path: getPath('/konversi-unit'),
			icon: RefreshCcw,
			isDropdown: false,
			children: []
		},
		{
			name: 'Pengaturan',
			icon: Settings,
			isDropdown: true,
			path: getPath('/pengaturan'),
			role: 'superadmin',
			children: [{ name: 'Manajemen Pengguna', path: getPath('/pengaturan/pengguna') }]
		}
	];
</script>

<aside
	class="flex h-screen flex-col overflow-hidden bg-[#2D5A43] text-white shadow-xl transition-all duration-300 ease-in-out"
	class:w-64={sidebar.open}
	class:w-[70px]={!sidebar.open}
>
	<div class="p-6">
		<div class="flex items-center gap-3">
			<img src="/logo-tni-ad.png" width="35" height="35" alt="" class="shrink-0" />

			<div
				class="transition-opacity duration-300"
				class:opacity-0={!sidebar.open}
				class:pointer-events-none={!sidebar.open}
			>
				<h1
					class="text-sm leading-tight font-bold tracking-wider whitespace-nowrap text-yellow-400"
				>
					MINMAT
				</h1>
				<p class="text-[10px] font-medium tracking-tighter whitespace-nowrap uppercase opacity-80">
					MATKOMLEK
				</p>
			</div>
		</div>
	</div>

	<nav class="flex-1 overflow-x-hidden overflow-y-auto px-4">
		<ul class="space-y-1">
			{#each menus as menu}
				{#if !menu.role || menu.role === user.role}
					{#if menu.isDropdown}
						<SidebarDropdown
							name={sidebar.open ? menu.name : ''}
							icon={menu.icon}
							activePrefix={menu.path}
							children={menu.children}
						/>
					{:else}
						<SidebarLink href={menu.path} icon={menu.icon} name={sidebar.open ? menu.name : ''} />
					{/if}
				{/if}
			{/each}
		</ul>
	</nav>
</aside>
