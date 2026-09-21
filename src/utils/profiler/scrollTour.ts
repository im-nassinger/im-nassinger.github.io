import type { LongFrameStats } from './longFrameMonitor.ts';
import { diffSectionTotals, snapshotSectionTotals } from './profiler.ts';

// Scrolls the page by itself, the same way every time, and measures each phase separately.
// Programmatic scrolling fires the same scroll events and rendering work as a real user.

export type PhaseResult = {
    label: string;
    fps: number;
    p95FrameMs: number;
    worstFrameMs: number;
    longFrames: LongFrameStats | null;
    sections: ReturnType<typeof diffSectionTotals>;
};

export type TourResult = {
    label: string;
    phases: PhaseResult[];
};

type LongFrameSource = (startTime: number, endTime: number) => LongFrameStats | null;

type Phase = {
    label: string;
    durationMs: number;
    // scroll position at the start and at the end of the phase, from 0 (top) to 1 (bottom).
    fromProgress: number;
    toProgress: number;
};

const settleMs = 1000;

const phases: Phase[] = [
    { label: 'parado na hero', durationMs: 2500, fromProgress: 0, toProgress: 0 },
    { label: 'descendo até o fim', durationMs: 5000, fromProgress: 0, toProgress: 1 },
    { label: 'parado no fim', durationMs: 2000, fromProgress: 1, toProgress: 1 },
    { label: 'subindo até a hero', durationMs: 5000, fromProgress: 1, toProgress: 0 },
    { label: 'parado na hero de novo', durationMs: 2000, fromProgress: 0, toProgress: 0 }
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function getScrollContainer() {
    return document.querySelector<HTMLElement>('.simplebar-content-wrapper');
}

function scrollToProgress(container: HTMLElement, progress: number) {
    const maxScroll = container.scrollHeight - container.clientHeight;
    container.scrollTo({ top: maxScroll * progress, behavior: 'instant' });
}

function summarizeFrames(frameDurations: number[]) {
    const sorted = [...frameDurations].sort((a, b) => a - b);
    const totalMs = sorted.reduce((sum, value) => sum + value, 0);

    return {
        fps: sorted.length ? (sorted.length / totalMs) * 1000 : 0,
        p95FrameMs: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        worstFrameMs: sorted[sorted.length - 1] ?? 0
    };
}

function runPhase(container: HTMLElement, phase: Phase, getLongFrames: LongFrameSource) {
    return new Promise<PhaseResult>((resolve) => {
        const frameDurations: number[] = [];
        const sectionsBefore = snapshotSectionTotals();
        let startTime = 0;
        let lastTime = 0;

        const finish = (endTime: number) => {
            const sections = diffSectionTotals(sectionsBefore, snapshotSectionTotals(), endTime - startTime);

            resolve({
                label: phase.label,
                ...summarizeFrames(frameDurations),
                longFrames: getLongFrames(startTime, endTime),
                sections: sections.slice(0, 6)
            });
        };

        const onFrame = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            if (lastTime) frameDurations.push(timestamp - lastTime);

            lastTime = timestamp;

            const elapsed = timestamp - startTime;
            const phaseProgress = Math.min(elapsed / phase.durationMs, 1);
            const scrollProgress = phase.fromProgress + (phase.toProgress - phase.fromProgress) * phaseProgress;

            if (phase.fromProgress !== phase.toProgress) scrollToProgress(container, scrollProgress);

            if (phaseProgress < 1) {
                requestAnimationFrame(onFrame);
                return;
            }

            finish(timestamp);
        };

        requestAnimationFrame(onFrame);
    });
}

// measures the page standing still at the top (the hero), for comparing configurations.
export async function measureHeroIdle(label: string, durationMs: number, getLongFrames: LongFrameSource) {
    const container = getScrollContainer();

    if (!container) throw new Error('scroll container not found');

    scrollToProgress(container, 0);
    await wait(settleMs);

    return runPhase(container, { label, durationMs, fromProgress: 0, toProgress: 0 }, getLongFrames);
}

export async function runScrollTour(label: string, getLongFrames: LongFrameSource, onProgress: (message: string) => void): Promise<TourResult> {
    const container = getScrollContainer();

    if (!container) throw new Error('scroll container not found');

    scrollToProgress(container, 0);
    await wait(settleMs);

    const results: PhaseResult[] = [];

    for (const phase of phases) {
        onProgress(`${label}: ${phase.label}`);
        results.push(await runPhase(container, phase, getLongFrames));
    }

    return { label, phases: results };
}
