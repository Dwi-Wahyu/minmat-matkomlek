<script lang="ts">
	import {
		LayoutDashboard,
		Warehouse,
		FileText,
		Wrench,
		Building2,
		Settings,
		Map,
		Package
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import SidebarDropdown from './SidebarDropdown.svelte';
	import SidebarLink from './SidebarLink.svelte';
	import { getSidebarState } from './ui/sidebar/context.svelte';

	// 1. Definisikan Interface agar tidak ada error "Property 'role' does not exist"
	interface MenuItem {
		name: string;
		path: string;
		role?: string | string[]; // Dibuat opsional dengan tanda tanya
	}

	interface Menu {
		name: string;
		path: string;
		icon: any;
		isDropdown: boolean;
		role?: string | string[];
		children: MenuItem[];
	}

	// Definisi props dengan tipe data yang ketat
	let { user } = $props<{
		user: {
			role: string;
			organization: {
				slug: string;
				parentId: string | null;
			};
		};
	}>();

	const sidebar = getSidebarState();

	let openDropdown = $state<string | null>(null);

	$effect(() => {
		if (sidebar.open) {
			const activeMenu = menus.find((m) => m.isDropdown && page.url.pathname.startsWith(m.path));
			if (activeMenu) {
				openDropdown = activeMenu.name;
			}
		} else {
			openDropdown = null;
		}
	});

	function getPath(urlPath: string) {
		return `/${user.organization.slug}${urlPath}`;
	}

	/**
	 * Logika Akses:
	 * 1. Jika menu tidak punya role, semua boleh akses.
	 * 2. Jika menu punya role 'parent', hnya boleh diakses jika parentId === null.
	 * 3. Jika menu punya role lain (admin, dll), cek apakah user.role cocok.
	 */
	function hasRole(menuRole: string | string[] | undefined, userRole: string) {
		if (!menuRole) return true;

		const roles = Array.isArray(menuRole) ? menuRole : [menuRole];

		// LOGIKA UTAMA: Cek hak akses 'parent'
		if (roles.includes('parent')) {
			// Jika user punya parentId (artinya dia anak/satker), blokir akses ke menu 'parent'
			if (user.organization.parentId !== null) {
				return false;
			}
		}

		// Cek role spesifik user (superadmin, kakomlek, dll)
		// Kita filter 'parent' dari pengecekan role string karena 'parent' adalah pengecekan struktur org
		const functionalRoles = roles.filter((r) => r !== 'parent');

		// Jika setelah difilter 'parent' masih ada role lain (seperti 'superadmin')
		if (functionalRoles.length > 0) {
			return functionalRoles.includes(userRole);
		}

		// Jika hanya ada role 'parent' dan lolos pengecekan parentId === null di atas
		return true;
	}

	const rawMenus: Menu[] = [
		{
			name: 'Dashboard',
			path: getPath('/dashboard'),
			icon: LayoutDashboard,
			isDropdown: false,
			children: []
		},
		{
			name: 'Stok Gudang',
			icon: Warehouse,
			isDropdown: true,
			path: getPath('/gudang'),
			children: [
				{ name: 'Gudang Komunity', path: getPath('/gudang/komunity') },
				{ name: 'Gudang Transito', path: getPath('/gudang/transito') },
				{ name: 'Gudang Balkir', path: getPath('/gudang/balkir') }
			]
		},
		{
			name: 'Data Materiil',
			icon: Package,
			path: getPath('/materiil'),
			isDropdown: true,
			children: [
				{ name: 'Alkomlek', path: getPath('/alat/alkomlek') },
				{ name: 'Alpernika & Lek', path: getPath('/alat/alpernika') },
				{ name: 'Barang Habis Pakai', path: getPath('/barang') },
				{ name: 'Import Inventaris', path: getPath('/materiil/import') }
			]
		},
		{
			name: 'Operasional',
			icon: Wrench,
			isDropdown: true,
			path: getPath('/operasional'),
			children: [
				{ name: 'Pemeliharaan', path: getPath('/pemeliharaan') },
				{ name: 'Peminjaman', path: getPath('/peminjaman') },
				{ name: 'Distribusi', path: getPath('/distribusi'), role: ['parent'] }
			]
		},
		{
			name: 'Laporan',
			icon: FileText,
			isDropdown: true,
			path: getPath('/laporan'),
			children: [
				{ name: 'LAP BTK - 16', path: getPath('/laporan/btk-16') },
				{ name: 'LAP PERNIKA & LEK', path: getPath('/laporan/pernika-lek') }
			]
		},
		{
			name: 'Infrastruktur',
			icon: Building2,
			isDropdown: true,
			path: getPath('/fasilitas'),
			children: [
				{ name: 'Data Tanah', path: getPath('/tanah') },
				{ name: 'Data Bangunan', path: getPath('/bangunan') },
				{ name: 'Manajemen Gudang', path: getPath('/gudang-management') }
			]
		},
		{
			name: 'Administrasi',
			icon: Settings,
			isDropdown: true,
			path: getPath('/pengaturan'),
			role: ['superadmin', 'kakomlek'],
			children: [
				{ name: 'Satuan Jajaran', path: getPath('/satuan-jajaran'), role: ['parent'] },
				{
					name: 'Manajemen Pengguna',
					path: getPath('/pengaturan/pengguna'),
					role: ['superadmin', 'parent']
				},
				{ name: 'Audit Log', path: getPath('/audit-log'), role: ['superadmin', 'kakomlek'] },
				{ name: 'Konversi Unit', path: getPath('/konversi-unit') }
			]
		}
	];

	const menus = $derived(
		rawMenus
			.filter((menu) => hasRole(menu.role, user.role))
			.map((menu) => {
				if (menu.isDropdown) {
					// Filter anak menu berdasarkan role juga
					const filteredChildren = menu.children.filter((child) => hasRole(child.role, user.role));
					return { ...menu, children: filteredChildren };
				}
				return menu;
			})
			// Sembunyikan dropdown jika isinya kosong setelah difilter
			.filter((menu) => !menu.isDropdown || menu.children.length > 0)
	);
</script>

<aside
	class="flex h-screen flex-col overflow-hidden bg-sidebar text-sidebar-foreground shadow-xl transition-all duration-300 ease-in-out"
	class:w-64={sidebar.open}
	class:w-[70px]={!sidebar.open}
>
	<div class="p-6">
		<div class="flex items-center gap-3">
			<img src="/logo.svg" width="35" height="35" alt="" class="shrink-0" />

			<div
				class="transition-opacity duration-300"
				class:opacity-0={!sidebar.open}
				class:pointer-events-none={!sidebar.open}
			>
				<h1
					class="text-sm leading-tight font-bold tracking-wider whitespace-nowrap text-sidebar-primary"
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
						isOpen={openDropdown === menu.name}
						onToggle={(open) => {
							if (open) openDropdown = menu.name;
							else openDropdown = null;
						}}
					/>
				{:else}
					<SidebarLink href={menu.path} icon={menu.icon} name={sidebar.open ? menu.name : ''} />
				{/if}
			{/each}
		</ul>
	</nav>
</aside>
