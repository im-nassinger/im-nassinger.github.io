// inspired by:
// https://github.com/chromium/chromium/tree/main/chrome/browser/resources/lens/overlay
// note: this only works well on chromium based browsers (because of performance issues on other browsers).

import { themeState } from '@/stores/themeState';
import { getCssVar } from '@/utils/dom/getCssVar';
import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const getColorString = (color: RGBAColor) => `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export type RGBAColor = {
    r: number;
    g: number;
    b: number;
    a: number;
}

export type HSLColor = {
    h: number;
    s: number;
    l: number;
}

function hueToRgb(p: number, q: number, t: number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

function hslToRgb(h: number, s: number, l: number): RGBAColor {
    h = h % 1;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hueToRgb(p, q, h + 1 / 3);
        g = hueToRgb(p, q, h);
        b = hueToRgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: 1
    };
}

function parseHslString(hslString: string): HSLColor {
    const match = hslString.match(/hsl\((\d+), (\d+)%, (\d+)%\)/);
    if (!match) throw new Error('Invalid HSL string');

    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = parseInt(match[3]);

    return { h, s, l };
}

function getMainColor(hslOffset?: HSLColor) {
    const mainColor = getCssVar('--main-color', document.body);
    const hslColor = parseHslString(mainColor);
    const rgbColor = hslToRgb(
        (hslColor.h + (hslOffset?.h ?? 0)) / 360,
        (hslColor.s + (hslOffset?.s ?? 0)) / 100,
        (hslColor.l + (hslOffset?.l ?? 0)) / 100
    );

    return {
        hslColor,
        rgbColor,
        toString: () => getColorString(rgbColor)
    };
}

function easeInOutSine(x: number): number {
    return -(Math.cos(Math.PI * x) - 1) / 2;
}

export type BackgroundEffectRendererOptions = {
    shaderCanvas: HTMLCanvasElement;
    sparklesSvg: HTMLImageElement;
}

export type CircleOptions = {
    index: number;
    x: number;
    y: number;
    radius: number;
    startX: number;
    startY: number;
    startRadius: number;
    targetX: number;
    targetY: number;
    targetRadius: number;
    progress: number;
    speed: number;
    color: RGBAColor;
}

export class Circle implements CircleOptions {
    index: number;
    x: number;
    y: number;
    radius: number;
    startX: number;
    startY: number;
    startRadius: number;
    targetX: number;
    targetY: number;
    targetRadius: number;
    progress: number;
    speed: number;
    color: RGBAColor;

    constructor(options: Partial<CircleOptions>) {
        this.index = options.index ?? 0;
        this.x = options.x ?? 0;
        this.y = options.y ?? 0;
        this.radius = options.radius ?? 0;
        this.startX = options.startX ?? this.x;
        this.startY = options.startY ?? this.y;
        this.startRadius = options.startRadius ?? this.radius;
        this.targetX = options.targetX ?? this.x;
        this.targetY = options.targetY ?? this.y;
        this.targetRadius = options.targetRadius ?? this.radius;
        this.progress = options.progress ?? 0;
        this.speed = options.speed ?? 0;
        this.color = options.color ?? {
            r: 255,
            g: 255,
            b: 255,
            a: 1
        };
    }
}

function createCircleGradient(
    ctx: CanvasRenderingContext2D,
    circle: Circle
) {
    const { x, y, radius, color } = circle;
    const alpha = color.a ?? 1;
    const radialGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

    radialGradient.addColorStop(0, getColorString({ ...color, a: alpha * 1 }));
    radialGradient.addColorStop(1, getColorString({ ...color, a: alpha * 0 }));

    return radialGradient;
}

export class BackgroundEffectRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    abortController = new AbortController();
    animation: ReturnType<typeof fixedTimeStep> | null = null;
    circles: Circle[] = [];
    targetFps = 30;

    sparkles = {
        image: new Image(),
        pattern: null as CanvasPattern | null,
        intervalId: null as any,
        offsetX: 0,
        offsetY: 0
    };

    constructor(options: BackgroundEffectRendererOptions) {
        this.canvas = options.shaderCanvas;
        this.ctx = this.canvas.getContext('2d')!;
        this.sparkles.image = options.sparklesSvg;

        this.onResize();

        window.addEventListener('resize', () => this.onResize(), {
            signal: this.abortController.signal
        });

        this.sparkles.image.addEventListener('load', () => this.onSparklesLoad());

        this.createCircles();
    }

    onSparklesLoad() {
        this.sparkles.pattern = this.ctx.createPattern(this.sparkles.image, 'repeat');

        this.sparkles.intervalId = setInterval(() => {
            this.sparkles.offsetX = Math.round(Math.random() * 500);
            this.sparkles.offsetY = Math.round(Math.random() * 500);
        }, 100);
    }

    onResize() {
        this.canvas.width = window.innerWidth * window.devicePixelRatio;
        this.canvas.height = window.innerHeight * window.devicePixelRatio;
        this.draw();
    }

    startAnimation() {
        const update = () => this.update();
        const render = () => this.draw();
        const fps = this.targetFps;

        this.animation = fixedTimeStep(update, render, fps, 'BackgroundEffectRenderer');
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getRandomRadius() {
        const max = this.canvas.width / 2;
        const min = max / 2;

        return clamp(randomRange(min, max), 500, 5000);
    }

    getCircleColor(index: number): RGBAColor {
        const { rgbColor } = getMainColor({
            h: (index - 1) * 15,
            s: index * 10,
            l: index * 2.5
        });

        rgbColor.a = { light: 0.1, dark: 0.065 }[themeState.theme];

        return rgbColor;
    }

    createCircles() {
        this.circles = [];

        const numCircles = 3;

        for (let i = 0; i < numCircles; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;

            const circle = new Circle({
                index: i,
                x,
                y,
                radius: this.getRandomRadius(),
                targetX: Math.random() * this.canvas.width,
                targetY: Math.random() * this.canvas.height,
                targetRadius: this.getRandomRadius(),
                progress: Math.random(),
                speed: 0.002 + Math.random() * 0.001,
                color: this.getCircleColor(i)
            });

            this.circles.push(circle);
        }
    }

    updateCircle(circle: Circle) {
        circle.progress += circle.speed;

        let t = clamp(circle.progress, 0, 1);

        t = easeInOutSine(circle.progress);

        circle.x = lerp(circle.startX, circle.targetX, t);
        circle.y = lerp(circle.startY, circle.targetY, t);
        circle.radius = lerp(circle.startRadius, circle.targetRadius, t);

        if (circle.progress >= 1) {
            circle.progress = 0;
            circle.startX = circle.x;
            circle.startY = circle.y;
            circle.startRadius = circle.radius;
            circle.targetX = Math.random() * this.canvas.width;
            circle.targetY = Math.random() * this.canvas.height;
            circle.targetRadius = this.getRandomRadius();
        }

        circle.color = this.getCircleColor(circle.index);
    }

    drawCircle(circle: Circle) {
        this.ctx.save();
        this.ctx.fillStyle = createCircleGradient(this.ctx, circle);
        this.ctx.beginPath();
        this.ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawSparkles() {
        if (!this.sparkles.image || !this.sparkles.pattern) return;

        this.sparkles.pattern.setTransform(
            new DOMMatrixReadOnly().translate(
                this.sparkles.offsetX,
                this.sparkles.offsetY
            )
        );

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.closePath();

        this.ctx.globalCompositeOperation = 'source-atop';
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = this.sparkles.pattern;
        this.ctx.fill();
        this.ctx.restore();
    }

    update() {
        for (const circle of this.circles) {
            this.updateCircle(circle);
        }
    }

    draw() {
        this.clear();

        for (const circle of this.circles) {
            this.drawCircle(circle);
        }

        this.drawSparkles();
    }

    destroy() {
        this.abortController.abort();

        if (this.animation) {
            this.animation.cancel();
            this.animation = null;
        }

        if (this.sparkles.intervalId) {
            clearInterval(this.sparkles.intervalId);
            this.sparkles.intervalId = null;
        }
    }
}