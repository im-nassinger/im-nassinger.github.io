import { deepMerge } from '@/utils/objects/deepMerge';
import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';
import type { BodyType, PhysicsBody, PhysicsShape, PhysicsWorld, Vector } from '../engine/index.ts';
import type { CanvasOverlay, CanvasRendererOptions, RenderableImage, RendererBounds, RenderOptions } from './CanvasRenderer.types.ts';

const defaultOptions: CanvasRendererOptions = {
    bgColor: 'transparent',
    timeStep: 1 / 60,
    pixelsPerMeter: 100,
    autoQuality: true,
    quality: 1,
    zoom: 1,
    offset: { x: 0, y: 0 },
    debug: false,
    default: {
        lineWidth: 2,
        strokeStyle: 'transparent',
        fillStyle: 'transparent'
    }
};

// in css pixels.
const debugLineWidth = 1.5;

const debugColors: Record<BodyType, { stroke: string; fill: string }> = {
    static: { stroke: 'rgba(255, 64, 160, 0.95)', fill: 'rgba(255, 64, 160, 0.12)' },
    kinematic: { stroke: 'rgba(64, 160, 255, 0.95)', fill: 'rgba(64, 160, 255, 0.12)' },
    dynamic: { stroke: 'rgba(64, 220, 120, 0.95)', fill: 'rgba(64, 220, 120, 0.12)' }
};

// One canvas pixel per device pixel. Rendering above the screen's resolution only
// multiplies the pixels to clear, draw and composite every frame.
const getCorrectQuality = (dpr: number = window.devicePixelRatio) => dpr;

export class CanvasRenderer {
    options: CanvasRendererOptions;
    parent: HTMLElement;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;

    computedValues = {
        halfWidth: 0,
        halfHeight: 0,
        actualScale: 0,
        actualOffset: { x: 0, y: 0 }
    };

    abortController = new AbortController();
    animation: ReturnType<typeof fixedTimeStep> | null = null;
    lastSceneState: unknown[] = [];
    readonly overlays = new Set<CanvasOverlay>();

    constructor(canvas: HTMLCanvasElement, options: DeepPartial<CanvasRendererOptions> = {}) {
        this.options = deepMerge(defaultOptions, options);
        this.parent = canvas.parentElement || document.body;
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d')!;

        this.onResize();

        window.addEventListener('resize', () => this.onResize(), {
            signal: this.abortController.signal
        });
    }

    get actualQuality() {
        const { autoQuality, quality } = this.options;
        return autoQuality ? getCorrectQuality() : quality;
    }

    calculateBounds() {
        const { computedValues, options } = this;
        const { halfWidth, halfHeight } = computedValues;
        const { pixelsPerMeter } = options;
        const { actualQuality } = this;

        const w = halfWidth / pixelsPerMeter / actualQuality;
        const h = halfHeight / pixelsPerMeter / actualQuality;

        return {
            minX: -w,
            minY: -h,
            maxX: w,
            maxY: h,
            width: w * 2,
            height: h * 2,
            halfWidth: w,
            halfHeight: h
        } as RendererBounds;
    }

    onResize() {
        this.setQuality(this.actualQuality);
        this.fitToParent();
    }

    destroy() {
        this.abortController.abort();
        this.animation?.cancel();
        this.animation = null;
    }

    setQuality(newQuality: number) {
        this.options.quality = newQuality;
        this.computeActualScale();
    }

    setOffset(offset: { x?: number, y?: number }) {
        if (offset.x !== undefined) this.options.offset.x = offset.x;
        if (offset.y !== undefined) this.options.offset.y = offset.y;

        this.computeActualOffset();
    }

    addOverlay(overlay: CanvasOverlay) {
        this.overlays.add(overlay);
        this.lastSceneState = [];

        return () => {
            this.overlays.delete(overlay);
            this.lastSceneState = [];
        };
    }

    fitToElement(element: HTMLElement) {
        this.resizeCanvas(element.offsetWidth, element.offsetHeight);
    }

    fitToParent() {
        this.resizeCanvas(this.parent.offsetWidth, this.parent.offsetHeight);
    }

    computeActualScale() {
        const { pixelsPerMeter, quality, zoom } = this.options;

        this.computedValues.actualScale = pixelsPerMeter * quality * zoom;
    }

    computeActualOffset() {
        const { offset, pixelsPerMeter, zoom, quality } = this.options;
        const { halfWidth, halfHeight } = this.computedValues;

        this.computedValues.actualOffset = {
            x: halfWidth + offset.x * pixelsPerMeter * zoom * quality,
            y: halfHeight + offset.y * pixelsPerMeter * zoom * quality
        };
    }

    getWorldPosition(screenX: number, screenY: number) {
        const { options } = this;
        const { pixelsPerMeter, quality, zoom } = options;
        const { actualOffset } = this.computedValues;
        const { x, y } = this.parent.getBoundingClientRect();
        const canvasX = screenX - x;
        const canvasY = screenY - y;

        return {
            x: ((canvasX - actualOffset.x / quality) / pixelsPerMeter / zoom),
            y: ((canvasY - actualOffset.y / quality) / pixelsPerMeter / zoom)
        };
    }

    animate(world: PhysicsWorld) {
        if (this.animation) {
            this.animation.cancel();
            this.animation = null;
        }

        const interval = this.options.timeStep * 1000;
        const fps = Math.round(1000 / interval);
        const update = () => world.step(this.options.timeStep);
        const render = () => this.renderWorld(world);

        this.animation = fixedTimeStep(update, render, fps, 'physics');
    }

    resizeCanvas(width: number, height: number): void {
        const quality = this.options.quality;
        const canvasWidth = width * quality;
        const canvasHeight = height * quality;

        Object.assign(this.computedValues, {
            halfWidth: canvasWidth / 2,
            halfHeight: canvasHeight / 2
        });

        this.canvas.width = window.innerWidth * quality;
        this.canvas.height = window.innerHeight * quality;

        // assigning the canvas size clears it, even when the size did not change.
        this.lastSceneState = [];

        this.computeActualOffset();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setContextOptions(renderOptions: RenderOptions) {
        const { ctx, options } = this;
        const { strokeStyle, fillStyle, lineWidth } = options.default;

        ctx.strokeStyle = renderOptions.strokeStyle || strokeStyle;
        ctx.fillStyle = renderOptions.fillStyle || fillStyle;
        ctx.lineWidth = (renderOptions.lineWidth || lineWidth) / options.pixelsPerMeter;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    drawBackground() {
        const { bgColor } = this.options;

        if (!bgColor || bgColor === 'transparent') return;

        const ctx = this.ctx;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Everything that affects the rendered image. When none of it changed since the last frame,
    // the canvas already shows the right picture and redrawing it would only cost GPU time.
    collectSceneState(world: PhysicsWorld) {
        const { actualScale, actualOffset } = this.computedValues;
        const state: unknown[] = [this.canvas.width, this.canvas.height, actualScale, actualOffset.x, actualOffset.y, this.options.debug];

        for (const body of world.bodies) {
            const render = body.userData.render;

            state.push(body.position.x, body.position.y, body.angle, body.shapes.size, render?.hidden, render?.image);
        }

        for (const overlay of this.overlays) {
            state.push(...overlay.getSceneState());
        }

        return state;
    }

    hasSceneChanged(world: PhysicsWorld) {
        const state = this.collectSceneState(world);
        const previousState = this.lastSceneState;

        this.lastSceneState = state;

        if (state.length !== previousState.length) return true;

        return state.some((value, index) => value !== previousState[index]);
    }

    renderWorld(world: PhysicsWorld) {
        const { ctx } = this;
        const { actualScale, actualOffset } = this.computedValues;

        if (!this.hasSceneChanged(world)) return;

        this.clearCanvas();
        this.drawBackground();

        ctx.save();
        ctx.translate(actualOffset.x, actualOffset.y);
        ctx.scale(actualScale, actualScale);

        for (const body of world.bodies) {
            this.renderBody(body);
        }

        for (const overlay of this.overlays) {
            ctx.save();
            overlay.draw(ctx);
            ctx.restore();
        }

        ctx.restore();
    }

    renderBody(body: PhysicsBody) {
        const bodyOptions = body.userData.render ?? {};
        const { debug } = this.options;

        if (bodyOptions.hidden && !debug) return;

        const ctx = this.ctx;

        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);

        if (!bodyOptions.hidden) {
            for (const shape of body.shapes) {
                this.renderShape(shape, bodyOptions);
            }

            // The body image is drawn once per body, not once per shape.
            if (bodyOptions.image) this.drawImage(bodyOptions.image);
        }

        if (debug) this.drawDebugGeometry(body);

        ctx.restore();
    }

    drawDebugGeometry(body: PhysicsBody) {
        const ctx = this.ctx;
        const { pixelsPerMeter, zoom } = this.options;
        const colors = debugColors[body.type];

        ctx.lineWidth = debugLineWidth / (pixelsPerMeter * zoom);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = colors.stroke;
        ctx.fillStyle = colors.fill;

        for (const shape of body.shapes) {
            if (shape.geometry.type === 'circle') {
                this.drawDebugCircle(shape.geometry.center, shape.geometry.radius);
                continue;
            }

            for (const polygon of shape.polygons) {
                this.drawDebugPolygon(polygon);
            }
        }

        this.drawDebugOrigin(ctx.lineWidth * 4);
    }

    drawDebugPolygon(vertices: Vector[]) {
        const ctx = this.ctx;

        ctx.beginPath();

        for (const { x, y } of vertices) {
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // The radius line makes the rotation of circles visible.
    drawDebugCircle(center: Vector, radius: number) {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(center.x + radius, center.y);
        ctx.stroke();
    }

    drawDebugOrigin(size: number) {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();
    }

    renderShape(shape: PhysicsShape, bodyOptions: RenderOptions) {
        const shapeOptions = shape.userData.render ?? {};
        const renderOptions = { ...bodyOptions, ...shapeOptions };

        if (renderOptions.hidden) return;

        this.setContextOptions(renderOptions);

        const shouldFill = this.isVisibleStyle(this.ctx.fillStyle);
        const shouldStroke = this.isVisibleStyle(this.ctx.strokeStyle);

        if (shouldFill || shouldStroke) {
            this.traceShapePath(shape);

            if (shouldFill) this.ctx.fill();
            if (shouldStroke) this.ctx.stroke();
        }

        if (shapeOptions.image) this.drawImage(shapeOptions.image);
    }

    isVisibleStyle(style: string | CanvasGradient | CanvasPattern) {
        if (typeof style !== 'string') return true;

        const isTransparent = style === 'transparent' || style === 'rgba(0, 0, 0, 0)';

        return !isTransparent;
    }

    traceShapePath(shape: PhysicsShape) {
        const ctx = this.ctx;
        const { geometry } = shape;

        ctx.beginPath();

        if (geometry.type === 'circle') {
            ctx.arc(geometry.center.x, geometry.center.y, geometry.radius, 0, 2 * Math.PI);
            return;
        }

        const { vertices } = geometry;

        for (let i = 0; i < vertices.length; i++) {
            const { x, y } = vertices[i];

            if (i === 0) {
                ctx.moveTo(x, y);
                continue;
            }

            ctx.lineTo(x, y);
        }

        if (vertices.length > 2) ctx.closePath();
    }

    drawImage(image: RenderableImage) {
        if (!image.element) return;

        const ctx = this.ctx;
        const { element, width, height, offset, angle = 0, scale } = image;

        ctx.save();

        if (offset) ctx.translate(offset.x, offset.y);
        if (angle) ctx.rotate(angle);
        if (scale) ctx.scale(scale, scale);

        const w = width || element.width;
        const h = height || element.height;

        ctx.drawImage(element, - w / 2, - h / 2, w, h);

        ctx.restore();
    }
}
