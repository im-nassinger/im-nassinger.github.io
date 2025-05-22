import { clsx } from '@/utils/dom/clsx';
import './Link.css';

export type LinkContainerProps = {
    className?: string;
    children: React.ReactNode;
}

export function LinkContainer(props: LinkContainerProps) {
    return (
        <div className={clsx('link-container', props.className)}>
            {props.children}
        </div>
    )
}

export type LinkProps = {
    className?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
    href: string;
    target?: string;
    children: string;
}

export function Link(props: LinkProps) {
    return (
        <div className={clsx('link', props.className)}>
            {props.icon && <props.icon className="icon" />}
            <a
                className="text"
                href={props.href}
                target={props.target || '_blank'}
            >
                {props.children}
            </a>
        </div>
    )
}