import { HashtagIcon } from '@/assets';
import { Text } from '@/components/ui';
import useOnScreen from '@/hooks/useOnScreen';
import { clsx } from '@/utils/dom/clsx';
import { ReactNode } from 'react';
import './Section.css';

export type SectionHashTitleProps = {
    className?: string;
    i18n?: string;
    children?: ReactNode;
}

export function SectionHashTitle(props: SectionHashTitleProps) {
    return (
        <div className={clsx('hash', props.className)}>
            <HashtagIcon className="icon" />
            <Text i18n={props.i18n}>{props.children}</Text>
        </div>
    );
}

export type SectionInfoProps = {
    className?: string;
    children: ReactNode;
}

export function SectionInfo(props: SectionInfoProps) {
    return (
        <div className={clsx('section-info', props.className)}>
            {props.children}
        </div>
    );
}

export type SectionTitleProps = {
    className?: string;
    i18n?: string;
    children?: ReactNode;
}

export function SectionTitle(props: SectionTitleProps) {
    return (
        <div className={clsx('section-title', props.className)}>
            <Text i18n={props.i18n}>{props.children}</Text>
        </div>
    );
}

export type SectionDescriptionProps = {
    className?: string;
    i18n: string;
    children?: ReactNode;
}

export function SectionDescription(props: SectionDescriptionProps) {
    return (
        <div className={clsx('section-description', props.className)}>
            <Text i18n={props.i18n}>{props.children}</Text>
        </div>
    );
}

type SectionProps = {
    className?: string;
    id?: string;
    fullscreen?: boolean;
    children?: React.ReactNode;
}

export function Section(props: SectionProps) {
    const [parentRef, childRef] = useOnScreen();

    return (
        // here I used "data-id" instead of "id" so I don't have to
        // prevent the default behavior (scrolling to the top) of the anchor tag.
        <div
            ref={parentRef}
            className={clsx(props.className, 'section', props.fullscreen && 'fullscreen')}
            data-id={props.id}
        >
            <div
                ref={childRef}
                className={clsx('section-content animate-view')}
            >
                {props.children}
            </div>
        </div>
    )
}