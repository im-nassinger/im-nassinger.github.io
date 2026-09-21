import type { CanvasRenderer, PhysicsWorld } from '@/components/physics';
import { getDebugHandle } from './profiler.ts';

// Starts the physics simulation the way hovering a logo does, and keeps throwing the logos around
// so they never come to rest: the same load as someone playing with them.

const throwIntervalMs = 700;

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function getNamedBodies(world: PhysicsWorld) {
    return [...world.bodies].filter((body) => !!body.userData.name);
}

export function isPhysicsAvailable() {
    return !!getDebugHandle<PhysicsWorld>('physicsWorld');
}

export function startShakingPhysics() {
    const world = getDebugHandle<PhysicsWorld>('physicsWorld');

    if (!world) return () => {};

    for (const body of getNamedBodies(world)) body.setType('dynamic');

    // up is negative y in this world.
    const throwLogos = () => {
        for (const body of getNamedBodies(world)) {
            body.setLinearVelocity({ x: randomBetween(-6, 6), y: randomBetween(-12, -4) });
        }
    };

    throwLogos();

    const intervalId = setInterval(throwLogos, throwIntervalMs);

    return () => clearInterval(intervalId);
}

// renders the physics canvas at one canvas pixel per css pixel instead of per device pixel.
export function renderPhysicsAtOneX() {
    const renderer = getDebugHandle<CanvasRenderer>('physicsRenderer');

    if (!renderer) return () => {};

    renderer.options.autoQuality = false;
    renderer.setQuality(1);
    renderer.fitToParent();

    return () => {
        renderer.options.autoQuality = true;
        renderer.onResize();
    };
}
