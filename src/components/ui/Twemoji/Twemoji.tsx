import { clsx } from '@/utils/dom/clsx';
import { memo } from 'react';
import './Twemoji.css';

const baseURL = '/twemoji/svg'; // https://jdecked.github.io/twemoji/v/latest/svg

type TwemojiProps = {
    className?: string;
    emoji: string;
    format?: 'svg' | 'png';
    width?: number;
    height?: number;
}

export const Twemoji = memo((props: TwemojiProps) => {
    const path = [...props.emoji]
        .map(char => char.codePointAt(0)?.toString(16))
        // https://en.wikipedia.org/wiki/Variation_Selectors_(Unicode_block)
        .filter(code => code !== 'fe0e' && code !== 'fe0f')
        .join('-');

    const src = `${baseURL}/${path}.${props.format || 'svg'}`;

    return (
        <img
            className={clsx('twemoji', props.className)}
            src={src}
            height={props.height || 24}
            width={props.width || 24}
            alt={props.emoji}
        />
    )
});