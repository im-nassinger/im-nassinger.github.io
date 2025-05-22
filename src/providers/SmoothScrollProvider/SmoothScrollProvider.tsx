import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { useNavigate } from '@/hooks/router';
import { getCurrentLocation } from '@/utils/misc/getCurrentLocation';
import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';
import { nextTick } from '@/utils/timing/nextTick';
import { useCallback, useEffect, useRef, useState } from 'react';
import SimpleBar from 'simplebar-react';
import './SmoothScrollProvider.css';

export type ScrollToTarget = number | HTMLElement | string;

export type ScrollToOptions = {
    duration?: number;
    easing?: (t: number) => number;
}

export type ScrollToFunction = (target: ScrollToTarget, options?: ScrollToOptions) => void;

export type SmoothScrollContextType = {
    container: HTMLDivElement | null;
    scrollTo: ScrollToFunction;
}

type SmoothScrollProviderProps = {
    sectionSelector?: string;
    defaultSelector?: string;
    children: React.ReactNode;
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function SmoothScrollProvider(props: SmoothScrollProviderProps) {
    const sectionSelector = props.sectionSelector || '[data-id]';
    const defaultSelector = props.defaultSelector || sectionSelector;

    const containerRef = useRef<HTMLDivElement>(null);
    const [container, setContainer] = useState<HTMLDivElement | null>(null);
    const justEntered = useRef(true);
    const lastId = useRef<string | null>(null);
    const ignoreNativeScroll = useRef(false);
    const activeScroll = useRef<ReturnType<typeof animateScroll> | null>(null);
    const hash = useRef(getCurrentLocation().hash);
    const navigate = useNavigate();

    const animateScroll = useCallback((element: HTMLElement, y: number, options?: ScrollToOptions) => {
        const container = containerRef.current;
        if (!container) return;

        const duration = options?.duration || 0.75;
        const easing = options?.easing || easeInOutCubic;

        const start = element.scrollTop;
        const end = y;
        const startTime = performance.now();

        let animation: ReturnType<typeof fixedTimeStep> | null = null;

        const update = () => {
            const currentTime = performance.now();
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            const t = easing(progress);
            const value = lerp(start, end, t);

            container.scrollTo({ top: value, behavior: 'instant' });

            ignoreNativeScroll.current = true;

            nextTick(() => ignoreNativeScroll.current = false);

            if (progress >= 1) animation?.cancel();
        };

        animation = fixedTimeStep(update, null, 60, 'SmoothScrollProvider');

        return animation;
    }, []);

    const scrollTo = useCallback((target: ScrollToTarget, options?: ScrollToOptions) => {
        const container = containerRef.current;
        if (!container) return;

        let y: number = 0,
            element: HTMLElement | null = null;

        if (typeof target === 'number') {
            y = target;
        } else if (target instanceof HTMLElement) {
            element = target;
        } else if (typeof target === 'string') {
            element = document.querySelector<HTMLElement>(target);
        }

        if (element) {
            const elementY = element.offsetTop;
            const elementHeight = element.offsetHeight;
            const windowHeight = window.innerHeight;

            if (elementHeight < windowHeight) {
                const halfElementHeight = elementHeight / 2;
                const halfWindowHeight = windowHeight / 2;
                const centerY = elementY + halfElementHeight - halfWindowHeight;

                y = centerY;
            } else {
                y = elementY;
            }

            const maxY = container.scrollHeight - container.clientHeight;

            if (y > maxY) y = maxY;
        }

        activeScroll.current?.cancel();
        activeScroll.current = animateScroll(container, y, options);
    }, [animateScroll]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const currentLocationId = hash.current.slice(1);

        let sectionId = currentLocationId;

        if (!sectionId) {
            const section = container.querySelector<HTMLElement>(defaultSelector);
            if (section) sectionId = section.id;
        }

        if (sectionId && justEntered.current) {
            navigate('#' + sectionId);
            scrollTo(`[data-id="${sectionId}"]`);

            justEntered.current = false;
        }

        const sections = [
            ...container.querySelectorAll<HTMLElement>(sectionSelector)
        ];

        const onScroll = () => {
            if (ignoreNativeScroll.current) {
                ignoreNativeScroll.current = false;
                return;
            }

            activeScroll.current?.cancel();

            const currentLocationId = getCurrentLocation().hash.slice(1);

            if (currentLocationId && currentLocationId !== lastId.current) {
                lastId.current = currentLocationId;
            }

            const scrollY = container.scrollTop;

            let currentSection: typeof sections[number] | null = null;

            if (scrollY === 0) {
                currentSection = sections[0];
            } else if (scrollY + container.clientHeight >= container.scrollHeight) {
                currentSection = sections[sections.length - 1];
            } else {
                const midpoint = scrollY + container.clientHeight / 2;

                currentSection = sections.find(section =>
                    section.offsetTop <= midpoint &&
                    section.offsetTop + section.clientHeight > midpoint
                ) || null;
            }

            const currentSectionId = currentSection?.dataset.id;

            if (currentSectionId && currentSectionId !== lastId.current) {
                navigate('#' + currentSectionId);
                lastId.current = currentSectionId;
            }
        };

        const cancelScroll = () => activeScroll.current?.cancel();

        const ctrl = new AbortController();
        const { signal } = ctrl;
        const options = { signal, passive: true };

        container.addEventListener('scroll', onScroll, options);
        container.addEventListener('wheel', cancelScroll, options);
        container.addEventListener('touchmove', cancelScroll, options);

        return () => ctrl.abort();
    }, [defaultSelector, navigate, sectionSelector, scrollTo]);

    useEffect(() => setContainer(containerRef.current), [containerRef]);

    return (
        <SimpleBar
            className="scroller"
            autoHide={true}
            scrollableNodeProps={{ ref: containerRef }}
        >
            <SmoothScrollContext.Provider
                value={{ container, scrollTo }}
            >
                {props.children}
            </SmoothScrollContext.Provider>
        </SimpleBar>
    );
}