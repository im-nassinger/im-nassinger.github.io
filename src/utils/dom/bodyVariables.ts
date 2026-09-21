// https://stackoverflow.com/questions/73568220/javascript-updating-css-custom-properties-slower-than-using-element-styles
// due to performance issues with setting CSS variables in the DOM:
// I'm temporarily disabling the hue animation when the user scroll or interacts with the page.
// Cause: when the --hue variable changes, the browser has to repaint all the elements that use it.

// --hue itself is animated by the "hue-cycle" css animation (see variables.css), because changes
// set from JS restarted every color transition on the page. This module only starts it at a random
// hue, pauses it while the user scrolls, and mirrors its value for canvas code through getHue().

import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';
import { debounce } from '../timing/debounce';

const shouldAnimateHue = true; // !import.meta.env.DEV;

const hueAnimationName = 'hue-cycle';
const fallbackHue = 180;

let viewW = window.innerWidth,
    viewH = window.innerHeight,
    lastViewW = -1,
    lastViewH = -1;

type HueClock = {
    animation: Animation;
    cycleMs: number;
    elapsedMs: number;
    runningSince: number | null;
};

let hueClock: HueClock | null = null;

// Runs once: getAnimations() and the computed timing force a style recalculation,
// so from here on the hue is tracked with our own clock instead of querying the animation.
function setupHueClock() {
    const animation = document.body.getAnimations().find((candidate) => (
        candidate instanceof CSSAnimation && candidate.animationName === hueAnimationName
    ));

    if (!animation) return;

    const cycleMs = Number(animation.effect?.getComputedTiming().duration);

    if (!Number.isFinite(cycleMs) || cycleMs <= 0) return;

    const elapsedMs = Math.random() * cycleMs;

    animation.currentTime = elapsedMs;

    hueClock = { animation, cycleMs, elapsedMs, runningSince: performance.now() };

    if (!shouldAnimateHue) pauseHue();
}

function pauseHue() {
    if (!hueClock || hueClock.runningSince === null) return;

    hueClock.elapsedMs += performance.now() - hueClock.runningSince;
    hueClock.runningSince = null;
    hueClock.animation.pause();
    hueClock.animation.currentTime = hueClock.elapsedMs;
}

function resumeHue() {
    if (!hueClock || hueClock.runningSince !== null || !shouldAnimateHue) return;

    hueClock.runningSince = performance.now();
    hueClock.animation.currentTime = hueClock.elapsedMs;
    hueClock.animation.play();
}

// The hue that --hue currently holds, without touching styles.
export function getHue() {
    if (!hueClock) return fallbackHue;

    const { cycleMs, elapsedMs, runningSince } = hueClock;
    const runningMs = runningSince === null ? 0 : performance.now() - runningSince;
    const progress = ((elapsedMs + runningMs) % cycleMs) / cycleMs;

    return Math.floor(progress * 360);
}

const setBodyVariable = (name: string, value: string | number) => {
    document.body.style.setProperty(name, value.toString());
};

const fps = window.innerWidth < 500 ? 4 : 30;

function updateViewSize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    if (viewW !== lastViewW) {
        setBodyVariable('--vw', window.innerWidth);
        lastViewW = viewW;
    }

    if (viewH !== lastViewH) {
        setBodyVariable('--vh', window.innerHeight);
        lastViewH = viewH;
    }
}

let isDoingSomething = false,
    somethingEndedTimeout: ReturnType<typeof setTimeout> | null = null,
    somethingStartedAt: number | null = null,
    scrollContainer: HTMLElement | null = null,
    lastPriority: number | null = null;

const setIsDoingSomething = debounce((howLong: number, priority: number) => {
    if (lastPriority && lastPriority > priority) return;

    isDoingSomething = true;
    lastPriority = priority;

    if (!somethingStartedAt) somethingStartedAt = performance.now();

    if (somethingEndedTimeout) clearTimeout(somethingEndedTimeout);

    somethingEndedTimeout = setTimeout(() => {
        isDoingSomething = false;
        somethingStartedAt = null;
        lastPriority = null;
    }, howLong);
}, 1);

function setupScrollContainer() {
    scrollContainer = document.querySelector<HTMLElement>('.simplebar-content-wrapper');

    if (!scrollContainer) return;

    scrollContainer.addEventListener('scroll', () => setIsDoingSomething(500, 2));
}

document.addEventListener('touchstart', () => setIsDoingSomething(1000, 1));

setupHueClock();

fixedTimeStep(() => {
    if (!scrollContainer) setupScrollContainer();
    if (!hueClock) setupHueClock();

    if (isDoingSomething) {
        pauseHue();
        return;
    }

    resumeHue();
    updateViewSize();
}, null, fps, 'body-variables');