import useOnScreen from '@/hooks/useOnScreen';
import { clsx } from '@/utils/dom/clsx';
import './ResponsiveList.css';

export type ResponsiveListProps = {
    className?: string;
    children: React.ReactNode;
    ref?: React.Ref<HTMLDivElement>;
}

export function ResponsiveList(props: ResponsiveListProps) {
    return (
        <div ref={props.ref} className={clsx('responsive-list', props.className)}>
            {props.children}
        </div>
    )
}

export type ResponsiveListItemProps = {
    name?: string;
    className?: string;
    children: React.ReactNode;
    ref?: React.Ref<HTMLDivElement>;
    style?: (React.CSSProperties & { [key: string]: any });
    onClick?: () => void;
}

export function ResponsiveListItem(props: ResponsiveListItemProps) {
    const [ref] = useOnScreen();

    return (
        <div
            ref={props.ref || ref}
            className={clsx('responsive-list-item animate-view', props.className)}
            data-name={props.name}
            style={props.style}
            onClick={props.onClick}
        >
            {props.children}
        </div>
    )
}