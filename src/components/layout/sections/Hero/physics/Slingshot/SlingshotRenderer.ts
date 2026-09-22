import type { Vector } from '@/components/physics';
import { worldGravity } from '../config';
import type { RubberBand } from './RubberBand';
import type { SlingshotBird } from './SlingshotBird';
import { slingshotArt } from './slingshotArt';
import { birdConfig, slingshotConfig, spritePixelsToMeters, trajectoryConfig } from './slingshotConfig';
import type { SlingshotSprite, SlingshotSprites } from './slingshotSprites';
import { addVectors, multiplyVector, subtractVectors, vectorFromAngle } from './vector';

export type SlingshotScene = {
    band: RubberBand;
    birds: SlingshotBird[];
    hasBirdInPouch: boolean;
};

const metersPerSpritePixel = spritePixelsToMeters(1);

// Draws in world meters, in the same layers as the game: the slingshot, the back band, the birds, the
// front band, and the left fork again on top, so the loaded bird looks like it sits between the forks.
export class SlingshotRenderer {
    private sprites: SlingshotSprites;

    constructor(sprites: SlingshotSprites) {
        this.sprites = sprites;
    }

    setSprites(sprites: SlingshotSprites) {
        this.sprites = sprites;
    }

    draw(ctx: CanvasRenderingContext2D, scene: SlingshotScene) {
        const { band } = scene;
        const holderPosition = this.getHolderPosition(band, scene.hasBirdInPouch);

        this.drawBackLayer(ctx, band, holderPosition);

        for (const bird of scene.birds) {
            this.drawSprite(ctx, this.sprites[bird.sprite], bird.body.position, bird.body.angle);
        }

        this.drawFrontLayer(ctx, band, holderPosition);

        if (band.isDragging && band.isStretchedEnoughToShoot) {
            this.drawTrajectory(ctx, band.bandPosition, band.getLaunchVelocity());
        }
    }

    private drawBackLayer(ctx: CanvasRenderingContext2D, band: RubberBand, holderPosition: Vector) {
        const backFork = addVectors(band.restPosition, slingshotConfig.backForkOffset);

        this.drawSprite(ctx, this.sprites.slingshot, band.restPosition);
        this.drawBand(ctx, backFork, holderPosition, band.stretchLength);
    }

    // the game draws the holder upright under the band at rest, and rotated over it while dragging.
    private drawFrontLayer(ctx: CanvasRenderingContext2D, band: RubberBand, holderPosition: Vector) {
        const frontFork = addVectors(band.restPosition, slingshotConfig.frontForkOffset);

        if (!band.isDragging) this.drawSprite(ctx, this.sprites.slingshotHolder, holderPosition);

        this.drawBand(ctx, frontFork, holderPosition, band.stretchLength);

        if (band.isDragging) this.drawSprite(ctx, this.sprites.slingshotHolder, holderPosition, band.bandAngle);

        this.drawFrontFork(ctx, band.restPosition);
    }

    // the same slingshot image, clipped to the left fork.
    private drawFrontFork(ctx: CanvasRenderingContext2D, restPosition: Vector) {
        ctx.save();
        ctx.translate(restPosition.x, restPosition.y);
        ctx.scale(metersPerSpritePixel, metersPerSpritePixel);

        ctx.beginPath();

        for (const point of slingshotArt.frontForkOutline) ctx.lineTo(point.x, point.y);

        ctx.closePath();
        ctx.clip();

        this.drawBitmap(ctx, this.sprites.slingshot);
        ctx.restore();
    }

    // Port of calculateRubberBand: with a bird in the pouch, the holder sits behind it, on the side
    // opposite to the rest point, so the bands wrap around the bird's back.
    private getHolderPosition(band: RubberBand, hasBirdInPouch: boolean) {
        if (!hasBirdInPouch) return band.bandPosition;

        const distanceBehindBird = birdConfig.radius + slingshotConfig.holderGap;
        const offset = multiplyVector(vectorFromAngle(band.bandAngle), distanceBehindBird);

        return subtractVectors(band.bandPosition, offset);
    }

    private drawBand(ctx: CanvasRenderingContext2D, from: Vector, to: Vector, stretchLength: number) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.lineWidth = slingshotConfig.getBandWidth(stretchLength);
        ctx.lineCap = 'round';
        ctx.strokeStyle = slingshotConfig.bandColor;
        ctx.stroke();
    }

    // p(t) = start + velocity * t + gravity * t² / 2, like the game's "sling scope".
    private drawTrajectory(ctx: CanvasRenderingContext2D, start: Vector, velocity: Vector) {
        const { dotCount, timeBetweenDots, dotRadius, alpha } = trajectoryConfig;

        for (let index = 1; index <= dotCount; index++) {
            const time = index * timeBetweenDots;
            const x = start.x + velocity.x * time;
            const y = start.y + velocity.y * time + worldGravity * time * time / 2;
            const fade = 1 - index / dotCount;

            ctx.beginPath();
            ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * fade})`;
            ctx.fill();
        }
    }

    // places the sprite's pivot on `position`, rotated around the pivot.
    private drawSprite(ctx: CanvasRenderingContext2D, sprite: SlingshotSprite, position: Vector, angle = 0) {
        ctx.save();
        ctx.translate(position.x, position.y);

        if (angle !== 0) ctx.rotate(angle);

        ctx.scale(metersPerSpritePixel, metersPerSpritePixel);
        this.drawBitmap(ctx, sprite);
        ctx.restore();
    }

    // expects the context in sprite pixels, with the origin on the sprite's pivot.
    private drawBitmap(ctx: CanvasRenderingContext2D, sprite: SlingshotSprite) {
        ctx.drawImage(sprite.bitmap, -sprite.pivot.x, -sprite.pivot.y, sprite.width, sprite.height);
    }
}
