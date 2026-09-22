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
}>;

// Custom drawing on top of the bodies, for things that are not physics bodies.
export type CanvasOverlay = {
    // called with the context already in world coordinates (meters).
    draw: (ctx: CanvasRenderingContext2D) => void;
    // everything that affects the overlay's image. The canvas is only redrawn when something changed.
    getSceneState: () => unknown[];
};

export type CanvasRendererOptions = {
    bgColor: string;
    timeStep: number;
    pixelsPerMeter: number;
    autoQuality: boolean;
    quality: number;
    zoom: number;
    offset: { x: number; y: number };
    // draws the collision geometry of every body on top of the regular rendering.
    debug: boolean;
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
};
