// Lightweight runtime profiler. It is enabled by adding "?profile" to the url and costs a single
// boolean check per call otherwise. Sections are also emitted as performance.measure entries,
// so they show up in the "Timings" track of the browser devtools Performance panel.

export type SectionStats = {
    name: string;
    callsPerSecond: number;
    averageMs: number;
    p95Ms: number;
    maxMs: number;
    msPerSecond: number;
};

type Bucket = {
    startedAt: number;
    durations: Map<string, number[]>;
};

const bucketDurationMs = 1000;
const bucketsKept = 3;

const buckets: Bucket[] = [];
const pausedLoops = new Set<string>();
const registeredLoops = new Set<string>();
const loopListeners = new Set<() => void>();

export const isProfilerEnabled = location.href.includes('?profile');

function getCurrentBucket(now: number) {
    const lastBucket = buckets[buckets.length - 1];

    if (lastBucket && now - lastBucket.startedAt < bucketDurationMs) return lastBucket;

    const bucket: Bucket = { startedAt: now, durations: new Map() };

    buckets.push(bucket);

    if (buckets.length > bucketsKept) buckets.shift();

    return bucket;
}

export type SectionTotals = Map<string, { calls: number; totalMs: number }>;

// never reset, so a test phase can diff a snapshot taken at its start against one taken at its end.
const cumulativeTotals: SectionTotals = new Map();

export function snapshotSectionTotals(): SectionTotals {
    const snapshot: SectionTotals = new Map();

    for (const [name, totals] of cumulativeTotals) {
        snapshot.set(name, { ...totals });
    }

    return snapshot;
}

export function diffSectionTotals(before: SectionTotals, after: SectionTotals, durationMs: number) {
    const seconds = durationMs / 1000;
    const stats: Omit<SectionStats, 'p95Ms' | 'maxMs'>[] = [];

    for (const [name, totals] of after) {
        const previous = before.get(name) ?? { calls: 0, totalMs: 0 };
        const calls = totals.calls - previous.calls;
        const totalMs = totals.totalMs - previous.totalMs;

        if (calls === 0) continue;

        stats.push({
            name,
            callsPerSecond: calls / seconds,
            averageMs: totalMs / calls,
            msPerSecond: totalMs / seconds
        });
    }

    return stats.sort((a, b) => b.msPerSecond - a.msPerSecond);
}

export function recordDuration(name: string, durationMs: number) {
    if (!isProfilerEnabled) return;

    const cumulative = cumulativeTotals.get(name);

    if (cumulative) {
        cumulative.calls++;
        cumulative.totalMs += durationMs;
    } else {
        cumulativeTotals.set(name, { calls: 1, totalMs: durationMs });
    }

    const bucket = getCurrentBucket(performance.now());
    const durations = bucket.durations.get(name);

    if (durations) {
        durations.push(durationMs);
        return;
    }

    bucket.durations.set(name, [durationMs]);
}

export function profile<T>(name: string, callback: () => T): T {
    if (!isProfilerEnabled) return callback();

    const start = performance.now();
    const result = callback();
    const end = performance.now();

    recordDuration(name, end - start);
    performance.measure(name, { start, end });

    return result;
}

function percentile(sortedValues: number[], ratio: number) {
    const index = Math.min(sortedValues.length - 1, Math.floor(sortedValues.length * ratio));
    return sortedValues[index] ?? 0;
}

// Aggregates the completed buckets, ignoring the one still being filled.
export function getSectionStats() {
    const completedBuckets = buckets.slice(0, -1);
    const seconds = completedBuckets.length;
    const merged = new Map<string, number[]>();

    if (seconds === 0) return [];

    for (const bucket of completedBuckets) {
        for (const [name, durations] of bucket.durations) {
            const existing = merged.get(name) ?? [];
            merged.set(name, existing.concat(durations));
        }
    }

    const stats: SectionStats[] = [];

    for (const [name, durations] of merged) {
        const sorted = [...durations].sort((a, b) => a - b);
        const total = sorted.reduce((sum, value) => sum + value, 0);

        stats.push({
            name,
            callsPerSecond: sorted.length / seconds,
            averageMs: total / sorted.length,
            p95Ms: percentile(sorted, 0.95),
            maxMs: sorted[sorted.length - 1],
            msPerSecond: total / seconds
        });
    }

    return stats.sort((a, b) => b.msPerSecond - a.msPerSecond);
}

// Objects the automated test needs to drive (e.g. the physics world), registered by the app
// only when profiling is enabled.
const debugHandles = new Map<string, unknown>();

export function registerDebugHandle(name: string, value: unknown) {
    if (!isProfilerEnabled) return;
    debugHandles.set(name, value);
}

export function getDebugHandle<T>(name: string) {
    return debugHandles.get(name) as T | undefined;
}

export function registerLoop(id: string) {
    if (!isProfilerEnabled || registeredLoops.has(id)) return;

    registeredLoops.add(id);

    for (const listener of loopListeners) listener();
}

export function getRegisteredLoops() {
    return [...registeredLoops];
}

export function onLoopsChanged(listener: () => void) {
    loopListeners.add(listener);
    return () => loopListeners.delete(listener);
}

export function isLoopPaused(id: string) {
    return isProfilerEnabled && pausedLoops.has(id);
}

export function setLoopPaused(id: string, paused: boolean) {
    if (paused) {
        pausedLoops.add(id);
        return;
    }

    pausedLoops.delete(id);
}
