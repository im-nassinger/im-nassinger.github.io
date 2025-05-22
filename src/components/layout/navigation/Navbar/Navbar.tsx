import { ActiveLine, Button, Tag } from '@/components/ui';
import { iconButtons, linkButtons } from '@/config/menu';
import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { useLocation, useNavigate } from '@/hooks/router';
import { useTranslation } from '@/hooks/useTranslation';
import { LocationObject } from '@/providers/LocationProvider';
import { navbarState, setButtonsHidden } from '@/stores/navbarState';
import { sidebarState } from '@/stores/sidebarState';
import { clsx } from '@/utils/dom/clsx';
import { Menu } from 'lucide-react';
import { memo, useContext, useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import './Navbar.css';

export type NavbarLinkButtonProps = {
    button: typeof linkButtons[number];
    onClick?: (button: typeof linkButtons[number]) => void;
}

export const NavbarLinkButton = memo((props: NavbarLinkButtonProps) => {
    const { button } = props;
    const isButtonActive = (location: LocationObject) => location.hash === button.href;
    const location = useLocation(isButtonActive, button.href);
    const navigate = useNavigate();
    const scrollCtx = useContext(SmoothScrollContext);

    if (!scrollCtx) {
        throw new Error('NavbarLinkButtons must be used within a <SmoothScrollContext>');
    }

    const { scrollTo } = scrollCtx;
    const active = location.hash === button.href;
    const sectionId = button.href.slice(1);

    const onClick = () => {
        const alreadyActive = isButtonActive(location);
        if (alreadyActive) return;

        navigate(button.href, { replace: true });
        scrollTo(`[data-id="${sectionId}"]`);

        props.onClick?.(button);
    };

    return (
        <Button
            className={active && 'active'}
            onClick={onClick}
            i18n={button.i18n}
        ></Button>
    );
});

export type NavbarLinkButtonsProps = {
    onClick?: (button: typeof linkButtons[number]) => void;
}

export const NavbarLinkButtons = memo((props: NavbarLinkButtonsProps) => {
    return linkButtons.map((button, i) => (
        <NavbarLinkButton key={i} button={button} onClick={props.onClick} />
    ));
});

// here, when a state changes, only corresponding button will re-render, not the whole tree.
// this avoids unnecessary re-renders.
export function NavbarIconButtons() {
    return iconButtons.map((button, i) => {
        const NavbarIconButton = () => {
            useSnapshot(button.state);

            const { t } = useTranslation();

            return <Button {...button} title={t(button.titleKey)} />
        };

        return <NavbarIconButton key={i} />
    });
}

const NavbarContent = memo((props: {
    logoRef: React.RefObject<HTMLDivElement | null>,
    buttonsRef: React.RefObject<HTMLDivElement | null>
}) => (
    <>
        <div ref={props.logoRef} className="logo">
            <span className="text">
                <Tag tagName="Nassinger" />
            </span>
        </div>
        <div className="actions">
            <div className="link-buttons" ref={props.buttonsRef}>
                <NavbarLinkButtons />
                <ActiveLine direction="bottom" />
            </div>
            <div className="icon-buttons">
                <NavbarIconButtons />
            </div>
            <Button
                className="menu-button"
                onClick={() => (sidebarState.isOpen = true)}
                icon={Menu}
            />
        </div>
    </>
));

export function Navbar() {
    useSnapshot(navbarState);

    const scrollCtx = useContext(SmoothScrollContext);

    if (!scrollCtx) {
        throw new Error('NavbarLinkButtons must be used within a <SmoothScrollContext>');
    }

    const navbarRef = useRef<HTMLDivElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const navbar = navbarRef.current;
        const logo = logoRef.current;
        const buttons = buttonsRef.current;
        if (!navbar || !logo || !buttons) return;

        const updateButtonsDisplay = () => {
            const logoRight = logo.getBoundingClientRect().right;
            if (logoRight < 0) return setButtonsHidden(true);

            const buttonsLeft = buttons.getBoundingClientRect().left;
            const style = getComputedStyle(navbar);
            const gap = parseFloat(style.columnGap);
            const hidden = buttonsLeft <= logoRight + gap;

            setButtonsHidden(hidden);
        };

        updateButtonsDisplay();

        const observer = new ResizeObserver(updateButtonsDisplay);

        observer.observe(navbar);

        return () => {
            observer.disconnect();
        }
    }, [scrollCtx]);

    return (
        <div
            ref={navbarRef}
            className={clsx('navbar', navbarState.buttonsHidden && 'buttons-hidden')}
        >
            <NavbarContent logoRef={logoRef} buttonsRef={buttonsRef} />
        </div>
    );
}
