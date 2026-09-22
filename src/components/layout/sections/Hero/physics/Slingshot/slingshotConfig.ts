import type { Vector } from '@/components/physics';
import { pixelsPerMeter, worldGravity } from '../config';
import { birdArt, slingshotArt } from './slingshotArt';

// The slingshot is a port of Angry Birds Classic (data/scripts/Slingshot.lua). The game measures
// everything in its own meters, 20 sprite pixels each. These constants convert them to this world.

// css pixels per game sprite pixel.
export const spriteScale = 1.05;

// one game meter, in world meters.
const gameMeter = 20 * spriteScale / pixelsPerMeter;

export const spritePixelsToMeters = (spritePixels: number) => spritePixels * spriteScale / pixelsPerMeter;

const spritePixelsToVector = (point: Vector) => ({ x: spritePixelsToMeters(point.x), y: spritePixelsToMeters(point.y) });

// This page falls about twice as fast as the game (worldGravity vs 20 game m/s²). Scaling the launch
// speed by the square root of that ratio keeps the same trajectory shape as the game.
const gameGravity = 20 * gameMeter;
const launchSpeedScale = Math.sqrt(worldGravity / gameGravity);

export const slingshotConfig = {
    // getShootRange
    grabRadius: 2.2 * gameMeter,
    // 2.2 + 3.2
    maxStretch: 5.4 * gameMeter,
    // isStretchedEnoughToShootBird
    minStretchToShoot: 2 * gameMeter,
    // defaultForce = -800, divided by physicsToWorld = 20
    maxLaunchSpeed: 40 * gameMeter * launchSpeedScale,
    // updateRubberBandWobble -> dampedSpring(1500, 50, distance, velocity) * 0.05 * physicsScale,
    // applied once per frame at 60 fps in the game.
    springStiffness: 1500,
    springDamping: 50,
    springStepFactor: 0.05 / 20,
    springReferenceTimeStep: 1 / 60,
    // rubberBandStretchabilityFactor: the band barely moves at these angles, so the bird cannot be shot
    // straight up (dragging it down into the trunk) or into the floor (dragging it up over the forks).
    // The angle is the direction from the band towards the rest point: -PI/2 is dragging straight down,
    // +PI/2 is dragging straight up, and going away from those is dragging towards the right.
    shortStretch: {
        factor: 0.25,
        // how wide the fade back to the full stretch is, at both ends of every range.
        fadeAngle: 0.15,
        ranges: [
            { fromAngle: -2.12, toAngle: -1.5 },
            { fromAngle: 0.7, toAngle: 2.6 }
        ]
    },
    // setRubberBandForSittingBird
    sittingOffset: { x: -0.1 * gameMeter, y: -0.1 * gameMeter },
    sittingAngle: Math.atan2(-0.1, 0.1),
    // calculateRubberBand: the holder sits this far behind the bird's surface
    holderGap: 0.05 * gameMeter,
    // where the bands are tied, from the rest point (the game uses +20 and -21 pixels)
    backForkOffset: spritePixelsToVector(slingshotArt.backForkOffset),
    frontForkOffset: spritePixelsToVector(slingshotArt.frontForkOffset),
    // Slingshot:init rubberBandColor
    bandColor: 'rgb(48, 23, 8)',
    // rubberBandWidth = clamp(50 / stretch, 10, 25), in sprite pixels. The width unit of the game's
    // native draw call is unknown, and half of it matches the look of the game.
    getBandWidth: (stretch: number) => {
        const stretchInGameMeters = stretch / gameMeter;
        const gameWidth = stretchInGameMeters > 0 ? Math.min(Math.max(50 / stretchInGameMeters, 10), 25) : 25;

        return spritePixelsToMeters(gameWidth * 0.5);
    },
    // the bottom of the trunk stands on the floor.
    restHeightAboveFloor: spritePixelsToMeters(slingshotArt.restHeightAboveBottom),
    // the left fork starts one logo width to the right of the content edge.
    restOffsetFromContentEdge: spritePixelsToMeters(slingshotArt.leftExtent) + 1
};

export const birdConfig = {
    // matches the body circle of the drawing. The game's 0.85 meters is smaller than its own sprite.
    // The density is higher than the game's (blocks.lua RedBird) so the bird can move the logos.
    radius: spritePixelsToMeters(birdArt.bodyRadius),
    density: 30,
    friction: 0.3,
    restitution: 0.43,
    // defaultAnimateBirdToSlingShot
    hopDuration: 1,
    hopArcAngle: 0.75 * Math.PI,
    hopHeightFactor: 1.33,
    waitingOffsetX: -2.5 * gameMeter,
    // when a launched bird counts as finished, so the next one hops in
    maxFlightTime: 6,
    restingSpeed: 0.3 * gameMeter,
    restingTimeToReload: 1,
    // a speed drop this big in one step counts as a hit, and the bird shuts its eyes for a moment
    collisionSpeedDrop: 4 * gameMeter * launchSpeedScale,
    collisionFaceTime: 0.5,
    maxFlownBirds: 3,
    blinkDuration: 0.15
};

// The slingshot starts hidden below the floor and rises when the pointer comes close.
export const revealConfig = {
    duration: 0.45,
    // how long it stays up after the pointer leaves the area.
    hideDelay: 1.2,
    // moves the rest point below the floor, far enough to hide the forks and the loaded bird.
    hiddenOffset: spritePixelsToMeters(slingshotArt.restHeightAboveBottom + 70),
    // the area around the visible rest point that reveals the slingshot, in world meters.
    area: { left: 2.5, right: 3.5, above: 3 }
};

// a static logo wakes up (becomes dynamic) when a moving body gets this close to it, in meters,
// plus the distance that body travels in two steps.
export const logoWakeMargin = 0.02;

export const trajectoryConfig = {
    dotCount: 30,
    timeBetweenDots: 0.07 / launchSpeedScale,
    dotRadius: spritePixelsToMeters(3),
    // extraTrajectory.alphaFactor
    alpha: 0.75
};
