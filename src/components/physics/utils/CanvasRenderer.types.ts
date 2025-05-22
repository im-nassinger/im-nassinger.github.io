import type * as planck from 'planck';
import { CanvasRenderer } from './CanvasRenderer';

export type RenderableObject<T extends object = object> = Omit<T, 'm_userData'> & {
    m_userData?: {
        [key: string]: any;
        render?: RenderOptions
    }
};

export type renderCallback = (renderer: CanvasRenderer, renderOptions: RenderOptions, dataArray?: any[]) => void;

export type RenderableImage = {
    element: HTMLImageElement | ImageBitmap;
} & Partial<{
    width: number;
    height: number;
    offset: { x: number; y: number };
    angle: number;
    scale: number;
}>;

export type RenderOptions = Partial<{
    hidden: boolean;
    strokeStyle: string;
    fillStyle: string;
    lineWidth: number;
    image: RenderableImage;
    callbacks: {
        beforeTransforms: renderCallback;
        afterTransforms: renderCallback;
        beforeDraw: renderCallback;
        afterDraw: renderCallback;
    }
}>;

export type RenderableWorld = planck.World & {
    getBodyList: () => RenderableBody | null;
    getJointList: () => RenderableJoint | null;
    getFixtureList: () => RenderableFixture | null;
};

export type RenderableBody = RenderableObject<planck.Body> & {
    getNext: () => RenderableBody | null;
};

export type RenderableFixture = RenderableObject<planck.Fixture> & {
    getNext: () => RenderableFixture | null;
    getShape: () => RenderableShape | null;
}

export type RenderableShape<T extends planck.Shape = planck.Shape> = RenderableObject<T>;

export type RenderableJoint = RenderableObject<planck.Joint> & {
    getNext: () => RenderableJoint | null;
};

export type RenderableDef<T extends object> = Omit<T, 'userData'> & {
    userData?: {
        [key: string]: any;
        render?: RenderOptions
    }
};

export type RenderableBodyDef = RenderableDef<planck.BodyDef>;

export type RenderableFixtureDef = RenderableDef<planck.FixtureDef>;

export type RenderableShapeDef = RenderableDef<planck.Shape>;

export type RenderableJointDef = RenderableDef<planck.JointDef>;

export type CanvasRendererOptions = {
    bgColor: string;
    timeStep: number;
    pixelsPerMeter: number;
    autoQuality: boolean;
    quality: number;
    zoom: number;
    offset: { x: number; y: number };
    default: {
        lineWidth: number;
        strokeStyle: string;
        fillStyle: string;
    }
};

export type RendererBounds = {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    halfWidth: number;
    halfHeight: number;
}