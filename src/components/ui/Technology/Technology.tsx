import { clsx } from '@/utils/dom/clsx';
import { memo } from 'react';
import { Text } from '../Text';
import './Technology.css';

export type TechnologyProps = {
    className?: string;
    children: string;
}

export const Technology = memo((props: TechnologyProps) => {
    const tech = props.children;

    return (
        <div className={clsx('technology', tech.toLowerCase())}>
            <Text className="text">{tech}</Text>
        </div>
    )
});