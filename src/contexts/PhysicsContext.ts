import type { CanvasRenderer } from '@/components/physics/utils/CanvasRenderer.ts';
import type { PhysicsBody, PhysicsShape, PhysicsUserData, PhysicsWorld, ShapeGeometry } from '@/components/physics/engine/index.ts';
import { createContext } from 'react';

export type ShapeDescriptor = {
    geometry: ShapeGeometry;
    userData?: PhysicsUserData;
};

export const RendererContext = createContext({} as {
    renderer: CanvasRenderer | null,
    world: PhysicsWorld | null,
    setWorld: (world: PhysicsWorld | null) => void
});

export const WorldContext = createContext({} as {
    world: PhysicsWorld
});

export const BodyContext = createContext({} as {
    body: PhysicsBody | null
});

export const FixtureContext = createContext({} as {
    shape: PhysicsShape | null,
    setShape: (shape: ShapeDescriptor) => void
});
