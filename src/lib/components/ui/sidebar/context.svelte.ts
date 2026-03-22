import { setContext, getContext } from 'svelte';

class SidebarState {
	open = $state(true);

	toggle() {
		this.open = !this.open;
	}

	setOpen(value: boolean) {
		this.open = value;
	}
}

const SIDEBAR_KEY = Symbol('sidebar');

export function setSidebarState() {
	const state = new SidebarState();
	setContext(SIDEBAR_KEY, state);
	return state;
}

export function getSidebarState() {
	const state = getContext<SidebarState>(SIDEBAR_KEY);
	if (!state) {
		throw new Error('getSidebarState must be used within a SidebarProvider');
	}
	return state;
}
