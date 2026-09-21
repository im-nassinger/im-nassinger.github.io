// Measures how long the browser takes to restyle and lay out the page, deterministically: each
// change is forced and the style/layout flush is timed synchronously, so GPU and frame pacing
// noise do not affect the numbers. Runs for a few seconds and blocks the page meanwhile.

export type SectionStyleCost = {
    label: string;
    elementCount: number;
    restyleMs: number;
};

export type StyleProbeResult = {
    totalElements: number;
    elementsOutsideSections: number;
    idleFlushMs: number;
    hueStepMs: number;
    fullRestyleMs: number;
    fullLayoutMs: number;
    sections: SectionStyleCost[];
};

const repetitions = 12;
const warmupRepetitions = 2;

// two hues far apart, so every hue-dependent color really changes between steps.
const probeHues = [20, 200];

// a style and layout flush of the whole document.
const flushStyleAndLayout = () => document.documentElement.offsetHeight;

function median(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function timeRepeatedly(applyStep: (stepIndex: number) => void) {
    const durations: number[] = [];

    flushStyleAndLayout();

    for (let i = 0; i < warmupRepetitions + repetitions; i++) {
        const start = performance.now();

        applyStep(i);
        flushStyleAndLayout();

        const duration = performance.now() - start;

        if (i >= warmupRepetitions) durations.push(duration);
    }

    return median(durations);
}

// important declarations override animations, so this sets the body's --hue despite the css animation.
function measureBodyHueStep() {
    const cost = timeRepeatedly((stepIndex) => {
        document.body.style.setProperty('--hue', String(probeHues[stepIndex % 2]), 'important');
    });

    document.body.style.removeProperty('--hue');

    return cost;
}

// an inherited custom property that nothing uses: every element restyles, nothing changes visually.
function measureFullRestyle() {
    const cost = timeRepeatedly((stepIndex) => {
        document.documentElement.style.setProperty('--profiler-restyle-probe', String(stepIndex));
    });

    document.documentElement.style.removeProperty('--profiler-restyle-probe');

    return cost;
}

// a sub-pixel width change on the body makes the browser lay out the whole page again.
function measureFullLayout() {
    const previousWidth = document.body.style.width;

    const cost = timeRepeatedly((stepIndex) => {
        document.body.style.width = stepIndex % 2 ? 'calc(100% - 0.5px)' : '100%';
    });

    document.body.style.width = previousWidth;

    return cost;
}

function describeSection(section: HTMLElement) {
    return section.dataset.id || section.className.split(' ')[0] || 'section';
}

// restyles one section alone by giving it its own hue-derived colors.
function measureSectionRestyle(section: HTMLElement): SectionStyleCost {
    const restyleMs = timeRepeatedly((stepIndex) => {
        section.style.setProperty('--main-color', `hsl(${probeHues[stepIndex % 2]}, 60%, 52%)`);
    });

    section.style.removeProperty('--main-color');

    return {
        label: describeSection(section),
        elementCount: section.querySelectorAll('*').length,
        restyleMs
    };
}

export function runStyleProbe(): StyleProbeResult {
    const sections = [...document.querySelectorAll<HTMLElement>('.section')];
    const totalElements = document.querySelectorAll('*').length;
    const elementsInSections = sections.reduce((sum, section) => sum + section.querySelectorAll('*').length + 1, 0);

    const result = {
        totalElements,
        elementsOutsideSections: totalElements - elementsInSections,
        idleFlushMs: timeRepeatedly(() => {}),
        hueStepMs: measureBodyHueStep(),
        fullRestyleMs: measureFullRestyle(),
        fullLayoutMs: measureFullLayout(),
        sections: sections.map(measureSectionRestyle)
    };

    flushStyleAndLayout();

    return result;
}
