import type { Vector } from '@/components/physics';

// Measurements of the vector drawings, taken in the units of each svg's viewBox and converted to
// "sprite pixels": the size of the game's original sprites. The rest of the slingshot code works in
// sprite pixels, so the drawings keep the game's proportions.

export type ArtSize = {
    width: number;
    height: number;
    // the point placed at the drawing position, in sprite pixels from the top left corner.
    pivot: Vector;
};

// slingshot.svg (viewBox 510 x 816) is scaled to the height of the game's sprite, 199 pixels.
const slingshotScale = 199 / 816;

// the midpoint between the two leather wraps, where the rubber bands meet at rest.
const slingshotRestPoint = { x: 360.9, y: 139.7 };

const fromSlingshotRestPoint = (point: Vector) => ({
    x: (point.x - slingshotRestPoint.x) * slingshotScale,
    y: (point.y - slingshotRestPoint.y) * slingshotScale
});

export const slingshotArt = {
    size: {
        width: 510 * slingshotScale,
        height: 816 * slingshotScale,
        pivot: { x: slingshotRestPoint.x * slingshotScale, y: slingshotRestPoint.y * slingshotScale }
    } satisfies ArtSize,
    // centers of the leather wraps, where the bands are tied.
    backForkOffset: fromSlingshotRestPoint({ x: 444.6, y: 126.15 }),
    frontForkOffset: fromSlingshotRestPoint({ x: 277.15, y: 153.3 }),
    restHeightAboveBottom: (816 - slingshotRestPoint.y) * slingshotScale,
    // how far the left fork reaches to the left of the rest point.
    leftExtent: (slingshotRestPoint.x - 152.2) * slingshotScale,
    // The drawing has both forks in one piece. The left fork is drawn a second time over the bird,
    // clipped by this outline, which follows the gap between the forks (measured row by row).
    frontForkOutline: [
        { x: 0, y: 0 }, { x: 360, y: 0 }, { x: 305, y: 40 }, { x: 349, y: 100 }, { x: 377, y: 160 },
        { x: 394, y: 200 }, { x: 414, y: 260 }, { x: 423, y: 300 }, { x: 430, y: 340 }, { x: 432, y: 368 },
        { x: 0, y: 368 }
    ].map(fromSlingshotRestPoint)
};

// The bird drawings are aligned by their body circle: its center is the pivot, and it is 39 sprite
// pixels wide, which is the body of the game's sprite.
const birdBodyWidth = 39;

type Box = { x: number; y: number; width: number; height: number };

function measureBird(viewBox: { width: number; height: number }, body: Box): ArtSize {
    const scale = birdBodyWidth / body.width;

    return {
        width: viewBox.width * scale,
        height: viewBox.height * scale,
        pivot: {
            x: (body.x + body.width / 2) * scale,
            y: (body.y + body.height / 2) * scale
        }
    };
}

// the body boxes of the smaller drawings are offset by the translate() of their root group.
export const birdArt = {
    bodyRadius: birdBodyWidth / 2,
    neutral: measureBird({ width: 1814.72, height: 1758.44 }, { x: 242.2, y: 255.3, width: 1572.5, height: 1503.1 }),
    blink: measureBird({ width: 158.18, height: 151.84 }, { x: 181.8 - 160.73, y: 126.1 - 104.08, width: 137.1, height: 129.8 }),
    flying: measureBird({ width: 160.71, height: 138.82 }, { x: 181.1 - 159.64, y: 130.7 - 110.59, width: 139.3, height: 118.7 })
};

// traced from the game's 18 x 26 holder sprite.
export const holderArt: ArtSize = { width: 18, height: 26, pivot: { x: 9, y: 13 } };
