import { Root as SelectRoot } from '$lib/components/ui/select';
import { Trigger as SelectTrigger } from '$lib/components/ui/select';
import { Group as SelectGroup } from '$lib/components/ui/select';
import { Label as SelectLabel } from '$lib/components/ui/select';
import { Separator as SelectSeparator } from '$lib/components/ui/select';
import { ScrollUpButton as SelectScrollUpButton } from '$lib/components/ui/select';
import { ScrollDownButton as SelectScrollDownButton } from '$lib/components/ui/select';
import { GroupHeading as SelectGroupHeading } from '$lib/components/ui/select';
import { Portal as SelectPortal } from '$lib/components/ui/select';

import Root from './searchable-select.svelte';
import Content from './searchable-select-content.svelte';
import Item from './searchable-select-item.svelte';

export {
	Root,
	Content,
	Item,
	SelectTrigger as Trigger,
	SelectGroup as Group,
	SelectLabel as Label,
	SelectSeparator as Separator,
	SelectScrollUpButton as ScrollUpButton,
	SelectScrollDownButton as ScrollDownButton,
	SelectGroupHeading as GroupHeading,
	SelectPortal as Portal,
	//
	Root as SearchableSelect,
	Content as SearchableSelectContent,
	Item as SearchableSelectItem,
	SelectTrigger as SearchableSelectTrigger,
	SelectGroup as SearchableSelectGroup,
	SelectLabel as SearchableSelectLabel,
	SelectSeparator as SearchableSelectSeparator,
	SelectScrollUpButton as SearchableSelectScrollUpButton,
	SelectScrollDownButton as SearchableSelectScrollDownButton,
	SelectGroupHeading as SearchableSelectGroupHeading,
	SelectPortal as SearchableSelectPortal
};
