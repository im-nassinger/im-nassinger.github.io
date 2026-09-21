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
