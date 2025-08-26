export function fixedTimeStep(
    updateCallback: () => void,
    renderCallback?: (() => void) | null,
    targetFps?: number,
    _id?: string
) {
    if (!targetFps) {
        updateCallback();
        renderCallback?.();
        return { cancel: () => { } };
    }

    targetFps = targetFps || 60;

    const targetInterval = 1000 / targetFps;

    let lastTime = 0,
        accumulatedTime = 0,
        animationId: number | null = null,
        cancelled = false,
        paused = false;

    const pause = () => {
        if (!animationId || cancelled) return;
        paused = true;
        cancelAnimationFrame(animationId);
        animationId = null;
    };

    const resume = () => {
        if (!paused || cancelled) return;
        paused = false;
        animationId = requestAnimationFrame(step);
    };

    function step(currentTime: number) {
        if (cancelled || paused) return;

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

    // window.addEventListener('blur', pause);
    // window.addEventListener('focus', resume);

    const onVisibilityChange = () => {
        if (document.hidden) {
            pause();
        } else {
            resume();
        }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return {
        get animationId() {
            return animationId;
        },
        get cancelled() {
            return cancelled;
        },
        get paused() {
            return paused;
        },
        pause,
        resume,
        cancel: () => {
            if (!animationId) return;

            cancelAnimationFrame(animationId);

            animationId = null;
            cancelled = true;
            paused = false;

            // window.removeEventListener('blur', pause);
            // window.removeEventListener('focus', resume);

            document.removeEventListener('visibilitychange', onVisibilityChange);
        }
    }
}