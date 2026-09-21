// Long Animation Frames API (Chromium 123+). Reports every frame that took longer than 50ms,
// split into script execution, rendering callbacks and style/layout, with script attribution.
// https://developer.chrome.com/docs/web-platform/long-animation-frames

type ScriptTiming = {
    duration: number;
    invoker: string;
    sourceURL: string;
    sourceFunctionName: string;
    sourceCharPosition: number;
    forcedStyleAndLayoutDuration: number;
};

type LongAnimationFrameEntry = PerformanceEntry & {
    blockingDuration: number;
    renderStart: number;
    styleAndLayoutStart: number;
    scripts: ScriptTiming[];
};

export type ScriptCost = {
    name: string;
    totalMs: number;
    forcedLayoutMs: number;
    count: number;
};

export type WorstLongFrame = {
    durationMs: number;
    agoMs: number;
    scriptMs: number;
    forcedLayoutMs: number;
    renderCallbacksMs: number;
    styleAndLayoutMs: number;
    scripts: ScriptCost[];
};

export type LongFrameStats = {
    worstFrame: WorstLongFrame | null;
    count: number;
    averageMs: number;
    maxMs: number;
    scriptMs: number;
    forcedLayoutMs: number;
    renderCallbacksMs: number;
    styleAndLayoutMs: number;
    topScripts: ScriptCost[];
};

const windowMs = 10_000;

export const isLongFrameApiSupported = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ?? false;

function describeScript(script: ScriptTiming) {
    const fileName = script.sourceURL.split('/').pop()?.split('?')[0] || 'unknown';
    const functionName = script.sourceFunctionName || script.invoker || 'anonymous';

    return `${functionName} (${fileName}:${script.sourceCharPosition})`;
}

function measureFrame(entry: LongAnimationFrameEntry) {
    const frameEnd = entry.startTime + entry.duration;
    const scriptMs = entry.scripts.reduce((sum, script) => sum + script.duration, 0);
    const forcedLayoutMs = entry.scripts.reduce((sum, script) => sum + script.forcedStyleAndLayoutDuration, 0);
    const hasRenderPhase = entry.renderStart > 0;
    const renderCallbacksMs = hasRenderPhase ? entry.styleAndLayoutStart - entry.renderStart : 0;
    const styleAndLayoutMs = hasRenderPhase ? frameEnd - entry.styleAndLayoutStart : 0;

    return { scriptMs, forcedLayoutMs, renderCallbacksMs, styleAndLayoutMs };
}

function describeWorstFrame(entries: LongAnimationFrameEntry[], now: number): WorstLongFrame | null {
    if (!entries.length) return null;

    const worstEntry = entries.reduce((worst, entry) => (entry.duration > worst.duration ? entry : worst));
    const frame = measureFrame(worstEntry);

    const scripts = worstEntry.scripts
        .map((script) => ({ name: describeScript(script), totalMs: script.duration, forcedLayoutMs: script.forcedStyleAndLayoutDuration, count: 1 }))
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, 5);

    return {
        durationMs: worstEntry.duration,
        agoMs: now - (worstEntry.startTime + worstEntry.duration),
        ...frame,
        scripts
    };
}

export function startLongFrameMonitor() {
    const entries: LongAnimationFrameEntry[] = [];

    if (!isLongFrameApiSupported) {
        return { getStats: () => null, getStatsBetween: () => null, stop: () => {} };
    }

    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            entries.push(entry as LongAnimationFrameEntry);
        }
    });

    observer.observe({ type: 'long-animation-frame', buffered: false });

    const collectPendingEntries = () => {
        for (const entry of observer.takeRecords()) {
            entries.push(entry as LongAnimationFrameEntry);
        }
    };

    const getStats = (): LongFrameStats => {
        const now = performance.now();

        collectPendingEntries();

        while (entries.length && now - entries[0].startTime > windowMs) {
            entries.shift();
        }

        return summarizeLongFrames(entries, now);
    };

    // only frames that started inside the given time range (for test phases of up to 10s).
    const getStatsBetween = (startTime: number, endTime: number): LongFrameStats => {
        collectPendingEntries();

        const entriesInRange = entries.filter((entry) => entry.startTime >= startTime && entry.startTime <= endTime);

        return summarizeLongFrames(entriesInRange, endTime);
    };

    const stop = () => observer.disconnect();

    return { getStats, getStatsBetween, stop };
}

function summarizeLongFrames(entries: LongAnimationFrameEntry[], now: number): LongFrameStats {
    const scriptCosts = new Map<string, ScriptCost>();
    const totals = { scriptMs: 0, forcedLayoutMs: 0, renderCallbacksMs: 0, styleAndLayoutMs: 0, durationMs: 0, maxMs: 0 };

    for (const entry of entries) {
        const frame = measureFrame(entry);

        totals.scriptMs += frame.scriptMs;
        totals.forcedLayoutMs += frame.forcedLayoutMs;
        totals.renderCallbacksMs += frame.renderCallbacksMs;
        totals.styleAndLayoutMs += frame.styleAndLayoutMs;
        totals.durationMs += entry.duration;
        totals.maxMs = Math.max(totals.maxMs, entry.duration);

        for (const script of entry.scripts) {
            const name = describeScript(script);
            const cost = scriptCosts.get(name) ?? { name, totalMs: 0, forcedLayoutMs: 0, count: 0 };

            cost.totalMs += script.duration;
            cost.forcedLayoutMs += script.forcedStyleAndLayoutDuration;
            cost.count++;

            scriptCosts.set(name, cost);
        }
    }

    const topScripts = [...scriptCosts.values()]
        .sort((a, b) => b.totalMs - a.totalMs)
        .slice(0, 6);

    return {
        worstFrame: describeWorstFrame(entries, now),
        count: entries.length,
        averageMs: entries.length ? totals.durationMs / entries.length : 0,
        maxMs: totals.maxMs,
        scriptMs: totals.scriptMs,
        forcedLayoutMs: totals.forcedLayoutMs,
        renderCallbacksMs: totals.renderCallbacksMs,
        styleAndLayoutMs: totals.styleAndLayoutMs,
        topScripts
    };
}
