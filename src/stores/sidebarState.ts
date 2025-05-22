import { proxy } from 'valtio';

export const sidebarState = proxy({
    isOpen: false
});

export const setSidebarOpen = (open: boolean) => sidebarState.isOpen = open;