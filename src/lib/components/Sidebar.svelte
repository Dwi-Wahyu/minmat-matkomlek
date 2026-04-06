<script lang="ts">
	import {
		LayoutDashboard,
		Warehouse,
		FileText,
		Wrench,
		Handshake,
		Building2,
		RefreshCcw,
		Settings,
		Mailbox,
		Map,
		Package
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

	function hasRole(menuRole: string | string[] | undefined, userRole: string) {
		if (!menuRole) return true;
		if (Array.isArray(menuRole)) return menuRole.includes(userRole);
		return menuRole === userRole;
	}

	const rawMenus = [
		{
			name: 'Dashboard',
			path: getPath('/dashboard'),
			icon: LayoutDashboard,
			isDropdown: false,
			children: []
		},
		// {
		// 	name: 'Stock Gudang',
		// 	icon: Warehouse,
		// 	isDropdown: true,
		// 	path: getPath('/gudang'),
		// 	children: [
		// 		{ name: 'Komunity', path: getPath('/gudang/komunity') },
		// 		{ name: 'Transito', path: getPath('/gudang/transito') },
		// 		{ name: 'Balkir', path: getPath('/gudang/balkir') }
		// 	]
		// },

		{
			name: 'Stok Gudang',
			icon: Warehouse,
			isDropdown: true,
			path: getPath(''),
			children: [
				{ name: 'Gudang Komunity', path: getPath('/gudang/komunity') },
				{ name: 'Gudang Transito', path: getPath('/gudang/transito') },
				{ name: 'Gudang Balkir', path: getPath('/gudang/balkir') },
				{ name: 'Konversi Unit', path: getPath('/konversi-unit') }
			]
		},

		{
			name: 'Data Materiil',
			icon: Package,
			isDropdown: true,
			children: [
				{ name: 'Alkomlek', path: getPath('/alat/alkomlek') },
				{ name: 'Alpernika & Lek', path: getPath('/alat/alpernika') },
				{ name: 'Barang Habis Pakai', path: getPath('/barang') }
			]
		},

		{
			name: 'Operasional',
			icon: Wrench,
			isDropdown: true,
			children: [
				{ name: 'Pemeliharaan', path: getPath('/pemeliharaan') },
				{ name: 'Peminjaman', path: getPath('/peminjaman') },
				{ name: 'Distribusi', path: getPath('/distribusi') }
			]
		},

		// SECTION: PELAPORAN
		{
			name: 'Laporan',
			icon: FileText,
			isDropdown: true,
			children: [
				{ name: 'LAP BTK - 16', path: getPath('/laporan/btk16') },
				{ name: 'LAP PERNIKA & LEK', path: getPath('/laporan/pernikalek') }
			]
		},

		// SECTION: PENGATURAN
		{
			name: 'Administrasi',
			icon: Settings,
			isDropdown: true,
			path: getPath('/pengaturan'),
			role: ['superadmin', 'kakomlek'],
			children: [
				{ name: 'Satuan Jajaran', path: getPath('/satuan-jajaran') },
				{ name: 'Manajemen Pengguna', path: getPath('/pengaturan/pengguna'), role: ['superadmin'] },
				{ name: 'Audit Log', path: getPath('/audit-log'), role: ['superadmin', 'kakomlek'] },
				{
					name: 'Satuan Jajaran',
					path: getPath('/satuan-jajaran'),
					role: ['superadmin', 'kakomlek']
				},
				...(user.organization?.parentId === null
					? [{ name: 'Tanah & Bangunan', path: getPath('/tanah-bangunan') }]
					: [])
			]
		},

		...(user.organization?.parentId === null
			? [
					{
						name: 'Tanah & Bangunan',
						icon: Map,
						isDropdown: true,
						path: getPath('/tanah-bangunan'),
						children: [
							{ name: 'Data Tanah', path: getPath('/tanah-bangunan/tanah') },
							{ name: 'Data Bangunan', path: getPath('/tanah-bangunan/bangunan') }
						]
					}
				]
			: []),

		{
			name: 'Pengaturan',
			icon: Settings,
			isDropdown: true,
			path: getPath('/pengaturan'),
			role: ['superadmin', 'kakomlek'],
			children: [
				{ name: 'Manajemen Pengguna', path: getPath('/pengaturan/pengguna'), role: ['superadmin'] },
				{ name: 'Audit Log', path: getPath('/audit-log'), role: ['superadmin', 'kakomlek'] }
			]
		}
	];

	const menus = $derived(
		rawMenus
			.filter((menu) => hasRole(menu.role, user.role))
			.map((menu) => {
				if (menu.isDropdown) {
					const filteredChildren = menu.children.filter((child) => hasRole(child.role, user.role));
					return { ...menu, children: filteredChildren };
				}
				return menu;
			})
			.filter((menu) => !menu.isDropdown || menu.children.length > 0)
	);
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
			{#each menus as menu (menu.name)}
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
			{/each}
		</ul>
	</nav>
</aside>
