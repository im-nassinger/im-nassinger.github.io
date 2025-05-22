import { RenderableImage } from '@/components/physics/utils/CanvasRenderer.types';
import { useContext, useEffect, useState } from 'react';
import { useObjectRef } from './useObjectRef';
import { useWindowSize } from './useWindowSize';
import { RendererContext } from '@/contexts/PhysicsContext';

export type Attributes = {
    [key: string]: string | number | boolean;
}

const imageCache = new Map<string, HTMLImageElement>();
const bitmapCache = new Map<string, ImageBitmap>();

// I'm rasterizing the image to a bitmap
// This is meant to be faster than rendering the SVG every frame
function bakeImage(
    image: HTMLImageElement,
    width: number,
    height: number,
    attributes?: Attributes
) {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;

    // TODO: allow all svg attributes to be passed in.
    const color = attributes?.color as string | null;

    if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-atop';
    }

    ctx.drawImage(image, 0, 0, width, height);

    return canvas.transferToImageBitmap();
}

const getKey = (...args: any[]) => {
    let result = '';

    for (const arg of args) {
        if (typeof arg === 'object') {
            result += JSON.stringify(arg);
        } else if (typeof arg === 'number') {
            result += arg.toFixed(2);
        } else {
            result += arg?.toString() || '';
        }
    }

    return result;
};

export const useMemoImage = (
    options: Omit<RenderableImage, 'element'> & {
        src: string;
        attributes?: Attributes
    }
) => {
    const rendererCtx = useContext(RendererContext);

    if (!rendererCtx) {
        throw new Error('useMemoImage must be used within a <Renderer>');
    }

    const { renderer } = rendererCtx;
    const windowSize = useWindowSize();
    const stableOptions = useObjectRef(options);
    const [ originalImage, setOriginalImage ] = useState<HTMLImageElement | null>(null);
    const [ version, setVersion ] = useState(0);

    useEffect(() => {
        let { src, width, height } = stableOptions;

        const imageCacheKey = getKey(src, width, height);
        const cachedImage = imageCache.get(imageCacheKey);

        if (cachedImage) {
            setOriginalImage(cachedImage);
            setVersion(v => v + 1);
            return;
        }
        
        const imageElement = new Image();
        const ctrl = new AbortController();
        const { signal } = ctrl;
        
        imageElement.addEventListener('load', () => {
            ctrl.abort();
            setOriginalImage(imageElement);
            setVersion(v => v + 1);

            imageCache.set(imageCacheKey, imageElement);
        }, { signal });

        imageElement.src = src;

        if (width) imageElement.width = width;
        if (height) imageElement.height = height;

        return () => {
            ctrl.abort();
        };
    }, [ stableOptions ]);

    const [ bakedImage, setBakedImage ] = useState<HTMLImageElement | ImageBitmap | null>(null);

    useEffect(() => {
        if (!renderer || !originalImage) return;

        const { pixelsPerMeter } = renderer.options;
        const quality = renderer.actualQuality;

        let { width = 1, height = 1, attributes } = stableOptions;

        width = width * pixelsPerMeter * window.devicePixelRatio * quality;
        height = height * pixelsPerMeter * window.devicePixelRatio * quality;

        const bitmapCacheKey = getKey(originalImage.src, width, height, attributes);
        const cachedBitmap = bitmapCache.get(bitmapCacheKey);

        if (cachedBitmap) {
            setBakedImage(cachedBitmap);
            setVersion(v => v + 1);
            return;
        }

        const bakedImage = bakeImage(originalImage, width, height, attributes);
        
        bitmapCache.set(bitmapCacheKey, bakedImage);

        setBakedImage(bakedImage);
        setVersion(v => v + 1);
    }, [ renderer, stableOptions, windowSize, originalImage ]);

    return useObjectRef({
        ...options,
        element: bakedImage,
        version // force a re-render when the baked image changes
    } as RenderableImage);
};