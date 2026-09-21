import type Box2DFactory from 'box2d3-wasm';

export type Box2D = Awaited<ReturnType<typeof Box2DFactory>>;
export type WorldId = ReturnType<Box2D['b2CreateWorld']>;
export type BodyId = ReturnType<Box2D['b2CreateBody']>;
export type ShapeId = ReturnType<Box2D['b2CreatePolygonShape']>;
export type JointId = ReturnType<Box2D['b2CreateMotorJoint']>;

let box2DPromise: Promise<Box2D> | null = null;

// The module is imported lazily so the wasm binary is only downloaded when a world is created.
export function loadBox2D() {
    if (box2DPromise) return box2DPromise;

    box2DPromise = import('box2d3-wasm').then(({ default: createBox2D }) => createBox2D());

    box2DPromise.catch(() => {
        box2DPromise = null;
    });

    return box2DPromise;
}
