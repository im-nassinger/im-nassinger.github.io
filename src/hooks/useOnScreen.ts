import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { useContext, useEffect, useRef } from 'react';

export type UseOnScreenOptions = {
    threshold?: number | number[];
};

const defaultOptions: UseOnScreenOptions = { threshold: 0.01 };

export default function useOnScreen<
    P extends HTMLElement = any,
    C extends HTMLElement = any
>(
    options: UseOnScreenOptions = defaultOptions
) {
    const parentRef = useRef<P>(null);
    const childRef = useRef<C>(null);
    const scrollCtx = useContext(SmoothScrollContext);

    if (!scrollCtx) {
        throw new Error('useOnScreen must be used within a <SmoothScrollContext>');
    }

    const { container } = scrollCtx;

    useEffect(() => {
        const parentElement = parentRef.current;
        if (!parentElement || !container) return;

        const childElement = childRef.current || parentElement;

        let inView = false,
            passed = false;

        const toggleClass = () => {
            childElement.classList.toggle('in-view', inView || passed);
        };

        const setInView = (visible: boolean) => {
            inView = visible;
            toggleClass();
        };

        const setPassed = (visible: boolean) => {
            passed = visible;
            toggleClass();
        };

        const observer = new IntersectionObserver(
            ([entry]) => {
                const visible = entry.isIntersecting;
                setInView(visible);

                const above = entry.boundingClientRect.top < 0;
                setPassed(visible || above);
            },
            {
                threshold: options.threshold,
                root: container
            }
        );

        observer.observe(parentElement);

        const handleScroll = () => {
            const nodeRect = parentElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const above = nodeRect.bottom < containerRect.top;
            const visible = nodeRect.bottom > containerRect.top && nodeRect.top < containerRect.bottom;
            
            setPassed(visible || above);
        };

        handleScroll();

        container.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);

        return () => {
            observer.disconnect();
            container.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [container, options.threshold]);

    return [parentRef, childRef] as const;
}