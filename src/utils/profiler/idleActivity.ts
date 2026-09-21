// Records what happens while nobody touches the page: which events keep arriving, which elements
// JS keeps mutating (inline style writes included) and which css animations or transitions run.
// Anything that shows up here is work the page does on its own, every frame or every few frames.

export type CountedItem = {
    name: string;
    perSecond: number;
};

export type IdleActivityResult = {
    durationMs: number;
    events: CountedItem[];
    mutations: CountedItem[];
    runningAnimations: string[];
};

const watchedEvents = ['mousemove', 'pointermove', 'scroll', 'wheel', 'resize', 'mouseover', 'mouseout'];

// ignores the profiler's own panel, which refreshes twice per second.
const isProfilerNode = (node: Node) => {
    const element = node instanceof Element ? node : node.parentElement;
    return !!element?.closest('.profiler-overlay');
};

function describeElement(element: Element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = [...element.classList].slice(0, 2).map((className) => `.${className}`).join('');

    return `${tag}${id}${classes}`;
}

function describeMutation(record: MutationRecord) {
    const target = record.target instanceof Element ? record.target : record.target.parentElement;
    const targetName = target ? describeElement(target) : 'text';

    if (record.type === 'attributes') return `${targetName} [${record.attributeName}]`;
    if (record.type === 'characterData') return `${targetName} (texto)`;

    return `${targetName} (filhos)`;
}

function describeAnimation(animation: Animation) {
    const effect = animation.effect;
    const target = effect instanceof KeyframeEffect && effect.target ? describeElement(effect.target) : '?';

    if (animation instanceof CSSTransition) return `transição de ${animation.transitionProperty} em ${target}`;
    if (animation instanceof CSSAnimation) return `animação ${animation.animationName} em ${target}`;

    return `animação via js em ${target}`;
}

function increment(counts: Map<string, number>, name: string) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
}

function toPerSecond(counts: Map<string, number>, durationMs: number) {
    return [...counts.entries()]
        .map(([name, count]) => ({ name, perSecond: count / (durationMs / 1000) }))
        .sort((a, b) => b.perSecond - a.perSecond)
        .slice(0, 12);
}

export function recordIdleActivity(durationMs: number) {
    return new Promise<IdleActivityResult>((resolve) => {
        const eventCounts = new Map<string, number>();
        const mutationCounts = new Map<string, number>();
        const runningAnimations = new Set<string>();
        const ctrl = new AbortController();

        for (const eventName of watchedEvents) {
            const onEvent = (event: Event) => {
                const origin = event.isTrusted ? 'do navegador' : 'sintético';
                increment(eventCounts, `${eventName} (${origin})`);
            };

            window.addEventListener(eventName, onEvent, { capture: true, passive: true, signal: ctrl.signal });
        }

        const mutationObserver = new MutationObserver((records) => {
            for (const record of records) {
                if (isProfilerNode(record.target)) continue;
                increment(mutationCounts, describeMutation(record));
            }
        });

        mutationObserver.observe(document.documentElement, {
            attributes: true,
            characterData: true,
            childList: true,
            subtree: true
        });

        // sampled a few times, since short transitions may start and end between samples.
        const sampleAnimations = () => {
            for (const animation of document.getAnimations()) {
                if (animation.playState === 'running') runningAnimations.add(describeAnimation(animation));
            }
        };

        const samplingInterval = setInterval(sampleAnimations, 250);

        setTimeout(() => {
            ctrl.abort();
            mutationObserver.disconnect();
            clearInterval(samplingInterval);

            resolve({
                durationMs,
                events: toPerSecond(eventCounts, durationMs),
                mutations: toPerSecond(mutationCounts, durationMs),
                runningAnimations: [...runningAnimations]
            });
        }, durationMs);
    });
}
