// https://stackoverflow.com/questions/73568220/javascript-updating-css-custom-properties-slower-than-using-element-styles
// due to performance issues with setting CSS variables in the DOM:
// I'm temporarily disabling the hue animation when the user scroll or interacts with the page.
// Cause: when the --hue variable changes, the browser has to repaint all the elements that use it.

import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';
import { debounce } from '../timing/debounce';

const shouldAnimateHue = true; // !import.meta.env.DEV;

let hue = Math.random() * 360,
    lastHue = -1,
    hueFlipDuration = 36 * 1000,
    viewW = window.innerWidth,
    viewH = window.innerHeight,
    lastViewW = -1,
    lastViewH = -1;

const setBodyVariable = (name: string, value: string | number) => {
    document.body.style.setProperty(name, value.toString());
};

const fps = window.innerWidth < 500 ? 4 : 30;
const callsPerFlip = fps * (hueFlipDuration / 1000);
const hueStep = 360 / callsPerFlip;

function updateHue() {
    hue = (hue + hueStep) % 360;

    const newHue = Math.floor(hue);

    if (newHue !== lastHue) {
        setBodyVariable('--hue', newHue);
        lastHue = newHue;
    }
}

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

fixedTimeStep(() => {
    if (!scrollContainer) setupScrollContainer();
    if (isDoingSomething) return;
    if (shouldAnimateHue) updateHue();

    updateViewSize();
}, null, fps, 'bodyVariables');