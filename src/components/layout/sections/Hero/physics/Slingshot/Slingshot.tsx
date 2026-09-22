import type { CanvasRenderer } from '@/components/physics';
import { RendererContext, WorldContext } from '@/contexts/PhysicsContext';
import { useWindowSize } from '@/hooks/useWindowSize';
import { memo, useContext, useEffect, useState } from 'react';
import { SlingshotController } from './SlingshotController';
import { slingshotConfig, spritePixelsToMeters } from './slingshotConfig';
import { bakeSlingshotSprites, loadSlingshotImages } from './slingshotSprites';
import type { SlingshotImages } from './slingshotSprites';

type SlingshotProps = {
    // world x of the left edge of the page content.
    contentLeftX: number;
};

// canvas pixels covered by one sprite pixel, with the page zoom and the screen's pixel density.
const getDevicePixelsPerSpritePixel = (renderer: CanvasRenderer) => (
    renderer.computedValues.actualScale * spritePixelsToMeters(1)
);

// An Angry Birds slingshot at the bottom left of the hero, to throw Red at the logos.
export const Slingshot = memo((props: SlingshotProps) => {
    const { renderer } = useContext(RendererContext);
    const { world } = useContext(WorldContext);
    const [images, setImages] = useState<SlingshotImages | null>(null);
    const [controller, setController] = useState<SlingshotController | null>(null);
    const windowSize = useWindowSize();

    useEffect(() => {
        let cancelled = false;

        loadSlingshotImages().then((loadedImages) => {
            if (!cancelled) setImages(loadedImages);
        }).catch((error) => {
            console.error('Failed to load the slingshot images.', error);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!renderer || !images) return;

        const sprites = bakeSlingshotSprites(images, getDevicePixelsPerSpritePixel(renderer));
        const createdController = new SlingshotController(world, renderer, sprites);

        setController(createdController);

        return () => {
            createdController.destroy();
            setController(null);
        };
    }, [world, renderer, images]);

    useEffect(() => {
        if (!controller || !renderer || !images) return;

        controller.setSprites(bakeSlingshotSprites(images, getDevicePixelsPerSpritePixel(renderer)));

        const floorY = renderer.calculateBounds().maxY;

        const restPosition = {
            x: props.contentLeftX + slingshotConfig.restOffsetFromContentEdge,
            y: floorY - slingshotConfig.restHeightAboveFloor
        };

        controller.setPlacement(restPosition, floorY);
    }, [controller, renderer, images, props.contentLeftX, windowSize]);

    return null;
});
