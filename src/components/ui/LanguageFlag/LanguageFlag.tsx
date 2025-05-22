import { Twemoji } from '@/components/ui';
import { clsx } from '@/utils/dom/clsx';
import { Languages } from 'lucide-react';
import './LanguageFlag.css';

export type LanguageFlagProps = {
    className?: string;
    emoji: string;
}

export function LanguageFlag(props: LanguageFlagProps) {
    return (
        <div className={clsx('language-flag icon', props.className)}>
            <Languages className="language-icon" />
            <Twemoji className="flag-icon" emoji={props.emoji} />
        </div>
    );
}