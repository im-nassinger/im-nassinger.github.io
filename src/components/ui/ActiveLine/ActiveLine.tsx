import { useWindowSize } from '@/hooks/useWindowSize';
import { clsx } from '@/utils/dom/clsx';
import { nextTick } from '@/utils/timing/nextTick';
import { useLayoutEffect, useRef } from 'react';
import './ActiveLine.css';

export type ActiveLineProps = {
    className?: string;
    direction?: 'top' | 'right' | 'bottom' | 'left';
}

export function ActiveLine({
    className,
    direction = 'bottom',
}: ActiveLineProps) {
    const ref = useRef<HTMLDivElement>(null);
    const windowSize = useWindowSize();

    useLayoutEffect(() => {
        const line = ref.current;
        if (!line) return;

        const isHorizontal = direction === 'top' || direction === 'bottom';
        const posVar = '--' + (isHorizontal ? 'x' : 'y');
        const sizeVar = '--' + (isHorizontal ? 'w' : 'h');

        const update = () => {
            const active = line.parentElement?.querySelector<HTMLElement>('.active');

            if (active) {
                const pos = isHorizontal ? active.offsetLeft : active.offsetTop;
                const size = isHorizontal ? active.offsetWidth : active.offsetHeight;

                line.style.setProperty(posVar, `${pos}px`);
                line.style.setProperty(sizeVar, `${size}px`);
            } else {
                line.style.setProperty(posVar, '0px');
            }
        };

        const fastUpdate = () => {
            line.classList.add('no-transition');
            update();
            nextTick(() => line.classList.remove('no-transition'));
        };

        fastUpdate();

        const observer = new MutationObserver((mutations) => {
            const isTextContent = mutations.some(({ type }) => type === 'characterData');

            if (isTextContent) {
                fastUpdate();
            } else {
                update();
            }
        });

        observer.observe(line.parentElement!, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
            childList: true,
            characterData: true,
        });

        return () => {
            observer.disconnect();
        };
    }, [windowSize, direction]);

    return (
        <div
            ref={ref}
            className={clsx('active-line', direction, className)}
        />
    );
}