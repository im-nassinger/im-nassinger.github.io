export function fixedTimeStep(
    updateCallback: () => void,
    renderCallback?: (() => void) | null,
    targetFps?: number,
    _id?: string
) {
    if (!targetFps) {
        updateCallback();
        renderCallback?.();
        return { cancel: () => {} };
    }

    targetFps = targetFps || 60;

    const targetInterval = 1000 / targetFps;

    let lastTime = 0,
        accumulatedTime = 0,
        animationId: number | null = null,
        cancelled = false;

    function step(currentTime: number) {
        if (cancelled) return;
        
        if (lastTime === 0) {
            lastTime = currentTime;
            animationId = requestAnimationFrame(step);
            return;
        }

        const deltaTime = currentTime - lastTime;

        lastTime = currentTime;
        accumulatedTime += deltaTime;
        
        while (accumulatedTime >= targetInterval) {
            updateCallback();
            renderCallback?.();
            accumulatedTime -= targetInterval;
        }

        animationId = requestAnimationFrame(step);
    }

    animationId = requestAnimationFrame(step);

    return {
        get animationId() {
            return animationId;
        },
        get cancelled() {
            return cancelled;
        },
        cancel: () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
                cancelled = true;
            }
        }
    }
}