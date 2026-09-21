import { startFrameMonitor } from '../frameMonitor.ts';
import type { FrameStats } from '../frameMonitor.ts';
import { isLongFrameApiSupported, startLongFrameMonitor } from '../longFrameMonitor.ts';
import type { LongFrameStats } from '../longFrameMonitor.ts';
import { getRegisteredLoops, getSectionStats, isLoopPaused, onLoopsChanged, setLoopPaused } from '../profiler.ts';
import type { SectionStats } from '../profiler.ts';
import { runStyleProbe } from '../styleProbe.ts';
import type { StyleProbeResult } from '../styleProbe.ts';
import { recordIdleActivity } from '../idleActivity.ts';
import { isPhysicsAvailable, renderPhysicsAtOneX, startShakingPhysics } from '../physicsDriver.ts';
import type { CountedItem, IdleActivityResult } from '../idleActivity.ts';
import { getScrollContainer, measureHeroIdle, runScrollTour } from '../scrollTour.ts';
import type { PhaseResult, TourResult } from '../scrollTour.ts';
import '../experimentToggles.css';
import './ProfilerOverlay.css';

type CssExperiment = {
    className: string;
    label: string;
};

const cssExperiments: CssExperiment[] = [
    { className: 'profiler-freeze-hue', label: 'congelar --hue' },
    { className: 'profiler-no-backdrop-filter', label: 'sem backdrop-filter' },
    { className: 'profiler-no-css-filters', label: 'sem filter (css)' },
    { className: 'profiler-hide-physics-canvas', label: 'esconder canvas da física' },
    { className: 'profiler-hide-background-canvas', label: 'esconder canvas do fundo' },
    { className: 'profiler-hide-canvases', label: 'esconder canvases' },
    { className: 'profiler-no-transitions', label: 'sem transições/animações' },
    { className: 'profiler-no-transitions-only', label: 'sem transições (hue continua)' },
    { className: 'profiler-fixed-bg-fg', label: 'fundos/textos com tom fixo' }
];

// A frame whose gap is much longer than its main thread time stalled outside of JS and style:
// usually rasterization or the GPU.
function describeWorstLongFrame(longFrames: LongFrameStats | null) {
    const worst = longFrames?.worstFrame;

    if (!worst) return ['pior frame longo (main thread): nenhum nos últimos 10s'];

    const lines = [
        `pior frame longo (main thread): ${worst.durationMs.toFixed(0)}ms, há ${(worst.agoMs / 1000).toFixed(1)}s`,
        `  scripts ${worst.scriptMs.toFixed(0)}ms (layout forçado ${worst.forcedLayoutMs.toFixed(0)}ms), callbacks de render ${worst.renderCallbacksMs.toFixed(0)}ms, estilo/layout ${worst.styleAndLayoutMs.toFixed(0)}ms`
    ];

    for (const script of worst.scripts) {
        lines.push(`  ${script.name}: ${script.totalMs.toFixed(1)}ms, layout forçado ${script.forcedLayoutMs.toFixed(1)}ms`);
    }

    return lines;
}

function describePhase(phase: PhaseResult) {
    const lines = [`  ${phase.label}: ${phase.fps.toFixed(1)} fps, p95 ${phase.p95FrameMs.toFixed(1)}ms, pior frame ${phase.worstFrameMs.toFixed(0)}ms`];
    const longFrames = phase.longFrames;

    if (longFrames && longFrames.count) {
        lines.push(`    frames longos: ${longFrames.count} (scripts ${longFrames.scriptMs.toFixed(0)}ms, layout forçado ${longFrames.forcedLayoutMs.toFixed(0)}ms, callbacks de render ${longFrames.renderCallbacksMs.toFixed(0)}ms, estilo/layout ${longFrames.styleAndLayoutMs.toFixed(0)}ms)`);
    }

    const worst = longFrames?.worstFrame;

    if (worst) {
        const topScript = worst.scripts[0];
        const topScriptText = topScript ? `, script principal ${topScript.name} ${topScript.totalMs.toFixed(0)}ms` : '';

        lines.push(`    pior frame longo: ${worst.durationMs.toFixed(0)}ms (scripts ${worst.scriptMs.toFixed(0)}ms, estilo/layout ${worst.styleAndLayoutMs.toFixed(0)}ms, render ${worst.renderCallbacksMs.toFixed(0)}ms${topScriptText})`);
    }

    const topSections = phase.sections.slice(0, 5).map((section) => `${section.name} ${section.msPerSecond.toFixed(1)}ms/s (${section.callsPerSecond.toFixed(0)}/s)`);

    if (topSections.length) lines.push(`    js: ${topSections.join(', ')}`);

    return lines;
}

function describeTour(tour: TourResult) {
    return [`percurso "${tour.label}":`, ...tour.phases.flatMap(describePhase)];
}

type AutomatedTestResult = {
    idleActivity: IdleActivityResult;
    styleProbe: StyleProbeResult;
    tours: TourResult[];
    heroConfigurations: PhaseResult[];
};

type HeroConfiguration = {
    label: string;
    classNames: string[];
    // keeps the logos flying around during the measurement.
    shakePhysics?: boolean;
    // applies an experiment that css classes cannot express, returning how to undo it.
    setup?: () => () => void;
};

// the hero standing still under each configuration. The hue is frozen in the gpu ones,
// so the page's repaints do not add noise to what the physics canvas costs.
const heroConfigurations: HeroConfiguration[] = [
    { label: 'física parada', classNames: [] },
    { label: 'física ativa', classNames: [], shakePhysics: true },
    { label: 'física ativa + hue congelado', classNames: ['profiler-freeze-hue'], shakePhysics: true },
    { label: 'física ativa + hue congelado + sem backdrop-filter', classNames: ['profiler-freeze-hue', 'profiler-no-backdrop-filter'], shakePhysics: true },
    { label: 'física ativa + hue congelado + canvas da física escondido', classNames: ['profiler-freeze-hue', 'profiler-hide-physics-canvas'], shakePhysics: true },
    { label: 'física ativa + hue congelado + sem canvas do fundo', classNames: ['profiler-freeze-hue', 'profiler-hide-background-canvas'], shakePhysics: true },
    { label: 'física ativa + hue congelado + canvas da física em 1x', classNames: ['profiler-freeze-hue'], shakePhysics: true, setup: renderPhysicsAtOneX },
    { label: 'física ativa + hue congelado + sem blur e sem canvas do fundo', classNames: ['profiler-freeze-hue', 'profiler-no-backdrop-filter', 'profiler-hide-background-canvas'], shakePhysics: true }
];

const heroMeasurementMs = 3000;

async function withClasses<T>(classNames: string[], run: () => Promise<T>) {
    for (const className of classNames) document.documentElement.classList.add(className);

    try {
        return await run();
    } finally {
        for (const className of classNames) document.documentElement.classList.remove(className);
    }
}

// each scroll tour runs with these experiments applied, to compare against the normal page.
const tourConfigurations = [
    { label: 'normal', classNames: [] },
    { label: 'hue totalmente congelado (teto)', classNames: ['profiler-freeze-hue'] }
];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAutomatedTest(getLongFrames: (start: number, end: number) => LongFrameStats | null, onProgress: (message: string) => void) {
    getScrollContainer()?.scrollTo({ top: 0, behavior: 'instant' });

    await wait(1000);

    onProgress('observando a hero parada');
    const idleActivity = await recordIdleActivity(3000);

    onProgress('diagnóstico de estilo (a página vai travar por alguns segundos)');
    await wait(100);

    const styleProbe = runStyleProbe();
    const tours: TourResult[] = [];

    for (const configuration of tourConfigurations) {
        tours.push(await withClasses(configuration.classNames, () => runScrollTour(configuration.label, getLongFrames, onProgress)));
    }

    const heroResults: PhaseResult[] = [];
    const physicsAvailable = isPhysicsAvailable();
    let stopShaking: (() => void) | null = null;

    for (const [index, configuration] of heroConfigurations.entries()) {
        if (configuration.shakePhysics && !physicsAvailable) continue;
        if (configuration.shakePhysics && !stopShaking) stopShaking = startShakingPhysics();

        onProgress(`hero ${index + 1}/${heroConfigurations.length}: ${configuration.label}`);

        const undoSetup = configuration.setup?.();

        try {
            const result = await withClasses(configuration.classNames, () => measureHeroIdle(configuration.label, heroMeasurementMs, getLongFrames));
            heroResults.push(result);
        } finally {
            undoSetup?.();
        }
    }

    stopShaking?.();

    if (!physicsAvailable) {
        onProgress('a física não está na página (a janela precisa ter 1200px ou mais de largura)');
    }

    return { idleActivity, styleProbe, tours, heroConfigurations: heroResults };
}

function describeStyleProbe(probe: StyleProbeResult) {
    const lines = [
        'diagnóstico de estilo (tempo de estilo+layout, mediana de 12):',
        `  elementos: ${probe.totalElements} no total, ${probe.elementsOutsideSections} fora das seções (inclui este painel)`,
        `  flush sem mudança nenhuma: ${formatMs(probe.idleFlushMs)}ms`,
        `  passo do hue: ${formatMs(probe.hueStepMs)}ms`,
        `  recalcular o estilo de todos os elementos: ${formatMs(probe.fullRestyleMs)}ms`,
        `  layout completo da página: ${formatMs(probe.fullLayoutMs)}ms`,
        '  recalcular cada seção sozinha:'
    ];

    for (const section of probe.sections) {
        lines.push(`    ${section.label}: ${formatMs(section.restyleMs)}ms, ${section.elementCount} elementos`);
    }

    return lines;
}

function describeCountedItems(title: string, items: CountedItem[]) {
    if (!items.length) return [`  ${title}: nenhum`];

    return [`  ${title}:`, ...items.map((item) => `    ${item.name}: ${item.perSecond.toFixed(1)}/s`)];
}

function describeIdleActivity(activity: IdleActivityResult) {
    const animations = activity.runningAnimations.length ? activity.runningAnimations : ['nenhuma'];

    return [
        `hero parada por ${(activity.durationMs / 1000).toFixed(0)}s, sem ninguém mexer:`,
        ...describeCountedItems('eventos recebidos', activity.events),
        ...describeCountedItems('mutações do DOM feitas por JS', activity.mutations),
        '  animações/transições rodando:',
        ...animations.map((animation) => `    ${animation}`)
    ];
}

function renderAutomatedTest(result: AutomatedTestResult | null) {
    if (!result) {
        return '<div class="muted">clique em "teste automático" e não mexa em nada por ~1min30s. depois clique em "copiar relatório".</div>';
    }

    const renderRow = (label: string, phase: PhaseResult) => `
        <tr>
            <td>${escapeHtml(label)}</td>
            <td>${phase.fps.toFixed(0)}</td>
            <td>${phase.worstFrameMs.toFixed(0)}</td>
        </tr>
    `;

    const rows = [
        ...result.tours.flatMap((tour) => tour.phases.map((phase) => renderRow(`${tour.label} · ${phase.label}`, phase))),
        ...result.heroConfigurations.map((phase) => renderRow(`hero · ${phase.label}`, phase))
    ];

    const probe = result.styleProbe;

    return `
        <div class="good">pronto! clique em "copiar relatório" e cole no chat.</div>
        <div>passo do hue ${formatMs(probe.hueStepMs)}ms · layout completo ${formatMs(probe.fullLayoutMs)}ms · ${probe.totalElements} elementos</div>
        <table>
            <tr><th>percurso · fase</th><th>fps</th><th>pior frame ms</th></tr>
            ${rows.join('')}
        </table>
    `;
}

const refreshIntervalMs = 500;

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => `&#${char.charCodeAt(0)};`);

const formatMs = (value: number) => value.toFixed(2);

function classifyFps(fps: number) {
    if (fps >= 55) return 'good';
    if (fps >= 40) return 'warn';
    return 'bad';
}

function renderFrameSummary(frames: FrameStats | null) {
    if (!frames) return '<span class="muted">medindo...</span>';

    const fpsClass = classifyFps(frames.fps);

    return `
        <span class="fps ${fpsClass}">${frames.fps.toFixed(0)} fps</span>
        <span class="muted">frame mediana ${formatMs(frames.medianMs)} / p95 ${formatMs(frames.p95Ms)} / máx ${formatMs(frames.maxMs)} ms · ${frames.jankyFramePercent.toFixed(0)}% travados</span>
    `;
}

function renderSectionTable(sections: SectionStats[]) {
    if (!sections.length) return '<div class="muted">nenhuma seção medida ainda.</div>';

    const heaviest = Math.max(...sections.map((section) => section.msPerSecond), 1);

    const rows = sections.map((section) => {
        const barWidth = (section.msPerSecond / heaviest) * 6;

        return `
            <tr>
                <td><span class="bar" style="width:${barWidth.toFixed(1)}rem"></span>${escapeHtml(section.name)}</td>
                <td>${section.msPerSecond.toFixed(1)}</td>
                <td>${section.callsPerSecond.toFixed(0)}</td>
                <td>${formatMs(section.averageMs)}</td>
                <td>${formatMs(section.p95Ms)}</td>
                <td>${formatMs(section.maxMs)}</td>
            </tr>
        `;
    });

    return `
        <table>
            <tr><th>seção</th><th>ms/s</th><th>chamadas/s</th><th>média</th><th>p95</th><th>máx</th></tr>
            ${rows.join('')}
        </table>
    `;
}

function renderLongFrames(longFrames: LongFrameStats | null) {
    if (!isLongFrameApiSupported) {
        return '<div class="muted">a API Long Animation Frames só existe em navegadores Chromium (123+).</div>';
    }

    if (!longFrames || !longFrames.count) {
        return '<div class="muted">nenhum frame acima de 50ms nos últimos 10s.</div>';
    }

    const scriptRows = longFrames.topScripts.map((script) => `
        <tr>
            <td>${escapeHtml(script.name)}</td>
            <td>${script.totalMs.toFixed(0)}</td>
            <td>${script.forcedLayoutMs.toFixed(0)}</td>
            <td>${script.count}</td>
        </tr>
    `);

    return `
        <div>${longFrames.count} frames longos · média ${longFrames.averageMs.toFixed(0)}ms · máx ${longFrames.maxMs.toFixed(0)}ms</div>
        <div class="muted">
            scripts ${longFrames.scriptMs.toFixed(0)}ms (layout forçado ${longFrames.forcedLayoutMs.toFixed(0)}ms) ·
            callbacks de render ${longFrames.renderCallbacksMs.toFixed(0)}ms ·
            estilo/layout ${longFrames.styleAndLayoutMs.toFixed(0)}ms
        </div>
        <table>
            <tr><th>script</th><th>ms</th><th>layout forçado</th><th>vezes</th></tr>
            ${scriptRows.join('')}
        </table>
    `;
}

function buildReport(frames: FrameStats | null, sections: SectionStats[], longFrames: LongFrameStats | null, automatedTest: AutomatedTestResult | null) {
    const pausedLoops = getRegisteredLoops().filter(isLoopPaused);
    const activeExperiments = cssExperiments.filter((experiment) => document.documentElement.classList.contains(experiment.className));

    const lines = [
        `# profiler report ${new Date().toISOString()}`,
        `viewport ${window.innerWidth}x${window.innerHeight} @ dpr ${window.devicePixelRatio}`,
        `user agent: ${navigator.userAgent}`,
        `loops pausados: ${pausedLoops.join(', ') || 'nenhum'}`,
        `experimentos css: ${activeExperiments.map((experiment) => experiment.label).join(', ') || 'nenhum'}`,
        ''
    ];

    if (frames) {
        lines.push(
            `fps ${frames.fps.toFixed(1)} | frame mediana ${formatMs(frames.medianMs)} p95 ${formatMs(frames.p95Ms)} max ${formatMs(frames.maxMs)} ms | ${frames.jankyFramePercent.toFixed(1)}% travados`,
            `pior intervalo entre frames (10s): ${frames.worstRecentMs.toFixed(0)}ms, há ${(frames.worstRecentAgoMs / 1000).toFixed(1)}s`,
            ''
        );
    }

    lines.push(...describeWorstLongFrame(longFrames), '');

    lines.push('seção | ms/s | chamadas/s | média | p95 | máx');

    for (const section of sections) {
        lines.push(`${section.name} | ${section.msPerSecond.toFixed(2)} | ${section.callsPerSecond.toFixed(1)} | ${formatMs(section.averageMs)} | ${formatMs(section.p95Ms)} | ${formatMs(section.maxMs)}`);
    }

    if (longFrames && longFrames.count) {
        lines.push(
            '',
            `frames longos (10s): ${longFrames.count}, média ${longFrames.averageMs.toFixed(1)}ms, máx ${longFrames.maxMs.toFixed(1)}ms`,
            `scripts ${longFrames.scriptMs.toFixed(0)}ms (layout forçado ${longFrames.forcedLayoutMs.toFixed(0)}ms), callbacks de render ${longFrames.renderCallbacksMs.toFixed(0)}ms, estilo/layout ${longFrames.styleAndLayoutMs.toFixed(0)}ms`
        );

        for (const script of longFrames.topScripts) {
            lines.push(`  ${script.name}: ${script.totalMs.toFixed(1)}ms, layout forçado ${script.forcedLayoutMs.toFixed(1)}ms, ${script.count}x`);
        }
    }

    if (automatedTest) {
        lines.push('', '## teste automático', '', ...describeIdleActivity(automatedTest.idleActivity), '', ...describeStyleProbe(automatedTest.styleProbe));

        for (const tour of automatedTest.tours) {
            lines.push('', ...describeTour(tour));
        }

        lines.push('', 'hero, por configuração (física ativa = logos sendo arremessados o tempo todo):', ...automatedTest.heroConfigurations.flatMap(describePhase));


    }

    return lines.join('\n');
}

function createToggle(label: string, checked: boolean, onChange: (checked: boolean) => void) {
    const wrapper = document.createElement('label');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    checkbox.checked = checked;
    checkbox.addEventListener('change', () => onChange(checkbox.checked));

    wrapper.append(checkbox, label);

    return wrapper;
}

function renderLoopToggles(container: HTMLElement) {
    const toggles = getRegisteredLoops().map((loopId) => (
        createToggle(loopId, !isLoopPaused(loopId), (running) => setLoopPaused(loopId, !running))
    ));

    container.replaceChildren(...toggles);
}

function renderCssToggles(container: HTMLElement) {
    const toggles = cssExperiments.map((experiment) => {
        const isActive = document.documentElement.classList.contains(experiment.className);

        return createToggle(experiment.label, isActive, (active) => {
            document.documentElement.classList.toggle(experiment.className, active);
        });
    });

    container.replaceChildren(...toggles);
}

export function mountProfilerOverlay() {
    const frameMonitor = startFrameMonitor();
    const longFrameMonitor = startLongFrameMonitor();

    const root = document.createElement('div');

    root.className = 'profiler-overlay';
    root.innerHTML = `
        <div class="header">
            <span class="frames"></span>
            <span class="spacer"></span>
            <button class="test-button">teste automático</button>
            <button class="copy">copiar relatório</button>
            <button class="minimize">_</button>
        </div>
        <div class="body">
            <h4>teste automático (scroll + benchmark)</h4>
            <div class="automated-test"></div>
            <h4>seções medidas (últimos 2s)</h4>
            <div class="sections"></div>
            <h4>frames longos &gt; 50ms (últimos 10s)</h4>
            <div class="long-frames"></div>
            <h4>laços de animação (desmarque para pausar)</h4>
            <div class="toggles loops"></div>
            <h4>experimentos css</h4>
            <div class="toggles css"></div>
            <div class="hint">
                ms/s = milissegundos de main thread gastos por segundo (1000 = thread inteira).
                paint e composição não aparecem aqui: compare o fps ligando e desligando os experimentos,
                ou grave no painel Performance do DevTools, onde as seções aparecem na trilha "Timings".
            </div>
        </div>
    `;

    document.body.append(root);

    const framesElement = root.querySelector<HTMLElement>('.frames')!;
    const sectionsElement = root.querySelector<HTMLElement>('.sections')!;
    const longFramesElement = root.querySelector<HTMLElement>('.long-frames')!;
    const loopsElement = root.querySelector<HTMLElement>('.loops')!;
    const cssElement = root.querySelector<HTMLElement>('.css')!;
    const copyButton = root.querySelector<HTMLButtonElement>('.copy')!;
    const minimizeButton = root.querySelector<HTMLButtonElement>('.minimize')!;
    const testButton = root.querySelector<HTMLButtonElement>('.test-button')!;
    const testElement = root.querySelector<HTMLElement>('.automated-test')!;

    let lastTest: AutomatedTestResult | null = null;

    testElement.innerHTML = renderAutomatedTest(null);

    renderLoopToggles(loopsElement);
    renderCssToggles(cssElement);
    onLoopsChanged(() => renderLoopToggles(loopsElement));

    const refresh = () => {
        // devtools captures measures when they are created, so the buffer can be emptied
        // to stop it from growing forever while the page stays open.
        performance.clearMeasures();

        framesElement.innerHTML = renderFrameSummary(frameMonitor.getStats());

        if (root.classList.contains('minimized')) return;

        sectionsElement.innerHTML = renderSectionTable(getSectionStats());
        longFramesElement.innerHTML = renderLongFrames(longFrameMonitor.getStats());
    };

    setInterval(refresh, refreshIntervalMs);

    minimizeButton.addEventListener('click', () => root.classList.toggle('minimized'));

    copyButton.addEventListener('click', async () => {
        const report = buildReport(frameMonitor.getStats(), getSectionStats(), longFrameMonitor.getStats(), lastTest);

        await navigator.clipboard.writeText(report);
        console.log(report);

        copyButton.textContent = 'copiado!';
        setTimeout(() => copyButton.textContent = 'copiar relatório', 1500);
    });

    testButton.addEventListener('click', async () => {
        const activeExperiments = cssExperiments.filter((experiment) => document.documentElement.classList.contains(experiment.className));

        for (const experiment of activeExperiments) document.documentElement.classList.remove(experiment.className);

        testButton.disabled = true;

        const onProgress = (message: string) => {
            testElement.innerHTML = `<div class="warn">rodando, não mexa em nada... ${escapeHtml(message)}</div>`;
        };

        try {
            lastTest = await runAutomatedTest(longFrameMonitor.getStatsBetween, onProgress);
            testElement.innerHTML = renderAutomatedTest(lastTest);
        } catch (error) {
            testElement.innerHTML = `<div class="bad">o teste falhou: ${escapeHtml(String(error))}</div>`;
        }

        for (const experiment of activeExperiments) document.documentElement.classList.add(experiment.className);

        testButton.disabled = false;
        renderLoopToggles(loopsElement);
        renderCssToggles(cssElement);
    });

    // keeps clicks on the overlay from reaching the page (e.g. the physics drag handler).
    root.addEventListener('pointerdown', (event) => event.stopPropagation());
}
