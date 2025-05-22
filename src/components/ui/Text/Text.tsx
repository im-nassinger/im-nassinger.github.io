import { useTranslation } from '@/hooks/useTranslation';
import { clsx } from '@/utils/dom/clsx';
import { ReactNode } from 'react';
import './Text.css';

export type TextProps = {
    className?: string;
    i18n?: string;
    i18nArgs?: Record<string, string>;
    children?: ReactNode;
    format?: (string: string) => ReactNode;
}

export function Text(props: TextProps) {
    const { t } = useTranslation(!!props.i18n);

    let text = props.i18n ? t(props.i18n, props.i18nArgs) : props.children;

    if (props.format && typeof text === 'string') {
        text = props.format(text);
    }

    return (
        <span className={clsx('text', props.className)}>
            {text}
        </span>
    )
}