import { ActiveLine } from '@/components/ui';
import { setSidebarOpen, sidebarState } from '@/stores/sidebarState';
import { clsx } from '@/utils/dom/clsx';
import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { NavbarIconButtons, NavbarLinkButtons } from '../Navbar';
import './Sidebar.css';

// here I'm using a memo to prevent unnecessary re-renders
const SidebarContent = memo(() => {
    return (
        <>
            <div className="background" onClick={() => setSidebarOpen(false)}></div>
            <div className="panel">
                <div className="content">
                    <div className="link-buttons">
                        <NavbarLinkButtons onClick={() => setSidebarOpen(false)} />
                        <ActiveLine direction="left" />
                    </div>
                    <div className="icon-buttons">
                        <NavbarIconButtons />
                    </div>
                </div>
            </div>
        </>
    )
});

export function Sidebar() {
    useSnapshot(sidebarState);

    return (
        <div className={clsx('sidebar', sidebarState.isOpen && 'open')}>
            <SidebarContent />
        </div>
    )
}