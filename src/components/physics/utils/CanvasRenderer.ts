import { deepMerge } from '@/utils/objects/deepMerge';
import { fixedTimeStep } from '@/utils/timing/fixedTimeStep';
import type * as planck from 'planck';
import { CanvasRendererOptions, RenderableBody, RenderableFixture, RenderableImage, RenderableJoint, RenderableShape, RenderableWorld, RendererBounds, RenderOptions } from './CanvasRenderer.types';

const defaultOptions: CanvasRendererOptions = {
    bgColor: 'transparent',
    timeStep: 1 / 60,
    pixelsPerMeter: 100,
    autoQuality: true,
    quality: 1,
    zoom: 1,
    offset: { x: 0, y: 0 },
    default: {
        lineWidth: 2,
        strokeStyle: 'transparent',
        fillStyle: 'transparent'
    }
};

const getCorrectQuality = (dpr: number = window.devicePixelRatio) => {
    return dpr < 1 ? dpr * (4 / 3) + (2 / 3) : dpr + 1;
};

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

    animate(world: planck.World) {
        if (this.animation) {
            this.animation.cancel();
            this.animation = null;
        }

        const interval = this.options.timeStep * 1000;
        const fps = Math.round(1000 / interval);
        const update = () => world.step(this.options.timeStep);
        const render = () => this.renderWorld(world as RenderableWorld);

        this.animation = fixedTimeStep(update, render, fps, 'CanvasRenderer');
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

        this.computeActualOffset();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    getRenderOptionsOf(...objects: any[]): RenderOptions {
        let result: RenderOptions = {};

        for (const object of objects) {
            let renderOptions: RenderOptions | undefined = {};

            if ('getUserData' in object) {
                renderOptions = object.getUserData()?.render;
            } else if ('m_userData' in object) {
                // planck.js currently does not have a userData property on shapes.
                // this is a workaround to access the userData property on shapes.
                renderOptions = object.m_userData?.render;
            }

            result = { ...result, ...renderOptions };
        }

        return result;
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

    renderBody(body: RenderableBody) {
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            this.renderFixture(body, fixture);
        }
    }

    renderFixture(body: RenderableBody, fixture: RenderableFixture) {
        const shape = fixture.getShape();

        this.renderShape(body, fixture, shape);
    }

    renderShape(body: RenderableBody, fixture: RenderableFixture, shape: RenderableShape) {
        const renderOptions = this.getRenderOptionsOf(body, fixture, shape);

        const drawShape = () => {
            const type = shape.getType();

            if (type === 'circle') {
                this.drawCircleShape(body, shape as planck.CircleShape);
            } else if (type === 'edge') {
                this.drawEdgeShape(body, shape as planck.EdgeShape);
            } else if (type === 'polygon' || type === 'chain') {
                this.drawPolygonShape(body, shape as planck.PolygonShape | planck.ChainShape);
            }
        };

        this.renderObject(renderOptions, drawShape, [body, fixture, shape]);
    }

    renderJoint(joint: RenderableJoint) {
        const renderOptions = this.getRenderOptionsOf(joint);

        this.renderObject(renderOptions, () => this.drawJoint(joint), [joint]);
    }

    drawBackground() {
        const { bgColor } = this.options;

        if (!bgColor || bgColor === 'transparent') return;

        const ctx = this.ctx;

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderWorld(world: RenderableWorld) {
        this.clearCanvas();
        this.drawBackground();

        for (let body = world.getBodyList(); body; body = body.getNext()) {
            this.renderBody(body);
        }

        for (let joint = world.getJointList(); joint; joint = joint.getNext()) {
            this.renderJoint(joint);
        }
    }

    renderObject(renderOptions: RenderOptions, draw: () => void, dataArray?: any[]) {
        if (renderOptions.hidden) return;

        const ctx = this.ctx;
        const callbacks = renderOptions.callbacks;
        const { beforeTransforms, afterTransforms, beforeDraw, afterDraw } = callbacks || {};
        const { actualScale, actualOffset } = this.computedValues;

        ctx.save();

        beforeTransforms?.(this, renderOptions, dataArray);

        ctx.translate(actualOffset.x, actualOffset.y);

        ctx.scale(actualScale, actualScale);

        afterTransforms?.(this, renderOptions, dataArray);

        this.setContextOptions(renderOptions);

        beforeDraw?.(this, renderOptions, dataArray);

        draw();

        const image = renderOptions.image;

        if (image) this.drawImage(image);

        afterDraw?.(this, renderOptions, dataArray);

        ctx.restore();
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

    drawCircleShape(body: RenderableBody, shape: planck.CircleShape): void {
        const ctx = this.ctx;
        const radius = shape.m_radius;
        const pos = body.getPosition();
        const angle = body.getAngle();

        ctx.beginPath();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }

    drawLine(x1: number, y1: number, x2: number, y2: number) {
        const ctx = this.ctx;

        ctx.beginPath();
        ctx.translate(x1, y1);
        ctx.moveTo(0, 0);
        ctx.lineTo(x2 - x1, y2 - y1);
        ctx.stroke();
        ctx.closePath();
    }

    drawEdgeShape(_body: RenderableBody, shape: planck.EdgeShape): void {
        const a = shape.m_vertex1;
        const b = shape.m_vertex2;
        this.drawLine(a.x, a.y, b.x, b.y);
    }

    drawJoint(joint: planck.Joint): void {
        const a = joint.getAnchorA();
        const b = joint.getAnchorB();
        this.drawLine(a.x, a.y, b.x, b.y);
    }

    drawPolygonShape(body: RenderableBody, shape: planck.PolygonShape | planck.ChainShape): void {
        const ctx = this.ctx;
        const vertices = shape.m_vertices;

        if (!vertices.length) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const { x, y } of vertices) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        const pos = body.getPosition();
        const angle = body.getAngle();

        ctx.beginPath();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(angle);

        for (let i = 0; i < vertices.length; i++) {
            const { x, y } = vertices[i];

            if (!i) {
                ctx.moveTo(x, y);
                continue;
            }

            ctx.lineTo(x, y);
        }

        if (vertices.length > 2) ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    }
}