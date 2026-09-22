import red from '@/assets/svg/angry-birds/red.svg';
import redBlink from '@/assets/svg/angry-birds/red-blink.svg';
import redFlying from '@/assets/svg/angry-birds/red-flying.svg';
import slingshot from '@/assets/svg/angry-birds/slingshot.svg';
import slingshotHolder from '@/assets/svg/angry-birds/slingshot-holder.svg';
import type { Vector } from '@/components/physics';
import { birdArt, holderArt, slingshotArt } from './slingshotArt';
import type { ArtSize } from './slingshotArt';

type SpriteSource = ArtSize & { src: string };

const spriteSources = {
    slingshot: { src: slingshot, ...slingshotArt.size },
    slingshotHolder: { src: slingshotHolder, ...holderArt },
    birdRed: { src: red, ...birdArt.neutral },
    birdRedBlink: { src: redBlink, ...birdArt.blink },
    birdRedFlying: { src: redFlying, ...birdArt.flying }
} satisfies Record<string, SpriteSource>;

export type SlingshotSpriteName = keyof typeof spriteSources;

export type SlingshotImages = Record<SlingshotSpriteName, HTMLImageElement>;

export type SlingshotSprite = {
    bitmap: ImageBitmap;
    // the drawn size and the pivot, in sprite pixels.
    width: number;
    height: number;
    pivot: Vector;
};

export type SlingshotSprites = Record<SlingshotSpriteName, SlingshotSprite>;

const spriteNames = Object.keys(spriteSources) as SlingshotSpriteName[];

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`could not load ${src}`));
        image.src = src;
    });
}

export async function loadSlingshotImages() {
    const loadedImages = await Promise.all(spriteNames.map(async (name) => {
        const image = await loadImage(spriteSources[name].src);

        return [name, image] as const;
    }));

    return Object.fromEntries(loadedImages) as SlingshotImages;
}

// Rasterizes each svg once, at exactly the size it covers on the screen, so the canvas copies its
// pixels one to one instead of scaling a small image (blurry) or drawing the svg every frame (slow).
function bakeSprite(image: HTMLImageElement, source: SpriteSource, devicePixelsPerSpritePixel: number): SlingshotSprite {
    const bitmapWidth = Math.ceil(source.width * devicePixelsPerSpritePixel);
    const bitmapHeight = Math.ceil(source.height * devicePixelsPerSpritePixel);

    const canvas = new OffscreenCanvas(bitmapWidth, bitmapHeight);
    const ctx = canvas.getContext('2d')!;

    ctx.drawImage(image, 0, 0, source.width * devicePixelsPerSpritePixel, source.height * devicePixelsPerSpritePixel);

    return {
        bitmap: canvas.transferToImageBitmap(),
        width: bitmapWidth / devicePixelsPerSpritePixel,
        height: bitmapHeight / devicePixelsPerSpritePixel,
        pivot: source.pivot
    };
}

export function bakeSlingshotSprites(images: SlingshotImages, devicePixelsPerSpritePixel: number) {
    const bakedSprites = spriteNames.map((name) => {
        const sprite = bakeSprite(images[name], spriteSources[name], devicePixelsPerSpritePixel);

        return [name, sprite] as const;
    });

    return Object.fromEntries(bakedSprites) as SlingshotSprites;
}
