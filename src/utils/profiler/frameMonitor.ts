export type FrameStats = {
    fps: number;
    medianMs: number;
    p95Ms: number;
    maxMs: number;
    jankyFramePercent: number;
    // the longest gap between two frames in the last 10s, with how long ago it ended.
    worstRecentMs: number;
    worstRecentAgoMs: number;
};

type FrameSample = {
    timestamp: number;
    durationMs: number;
};

const windowMs = 2000;
const worstFrameWindowMs = 10_000;

// a frame counts as janky when it takes 50% longer than the typical frame of this display.
const jankFactor = 1.5;

// Measures the interval between animation frames, which includes everything the browser did
// in between: scripts, style, layout, paint and waiting for the GPU.
export function startFrameMonitor() {
    const samples: FrameSample[] = [];
    let lastTimestamp = 0;
    let animationId = 0;

    const onFrame = (timestamp: number) => {
        if (lastTimestamp) samples.push({ timestamp, durationMs: timestamp - lastTimestamp });

        lastTimestamp = timestamp;

        while (samples.length && timestamp - samples[0].timestamp > worstFrameWindowMs) {
            samples.shift();
        }

        animationId = requestAnimationFrame(onFrame);
    };

    animationId = requestAnimationFrame(onFrame);

    const getStats = (): FrameStats | null => {
        const now = performance.now();
        const recentSamples = samples.filter((sample) => now - sample.timestamp <= windowMs);

        if (recentSamples.length < 2) return null;

        const worstSample = samples.reduce((worst, sample) => (sample.durationMs > worst.durationMs ? sample : worst));
        const sorted = recentSamples.map((sample) => sample.durationMs).sort((a, b) => a - b);
        const totalMs = sorted.reduce((sum, value) => sum + value, 0);
        const medianMs = sorted[Math.floor(sorted.length / 2)];
        const jankyFrames = sorted.filter((duration) => duration > medianMs * jankFactor).length;

        return {
            fps: (sorted.length / totalMs) * 1000,
            medianMs,
            p95Ms: sorted[Math.floor(sorted.length * 0.95)],
            maxMs: sorted[sorted.length - 1],
            jankyFramePercent: (jankyFrames / sorted.length) * 100,
            worstRecentMs: worstSample.durationMs,
            worstRecentAgoMs: now - worstSample.timestamp
        };
    };

    const stop = () => cancelAnimationFrame(animationId);

    return { getStats, stop };
}
