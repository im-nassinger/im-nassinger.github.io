import { CanvasRenderer } from '@/components/physics';
import planck from 'planck';
import { createContext } from 'react';

export type World = planck.World & {
    bullet?: boolean;
};

export const RendererContext = createContext({} as {
    renderer: CanvasRenderer | null,
    world: World | null,
    setWorld: (world: World | null) => void
});

export const WorldContext = createContext({} as {
    world: World
});

export const BodyContext = createContext({} as {
    body: planck.Body | null
});

export const FixtureContext = createContext({} as {
    fixture: planck.Fixture | null,
    shape: planck.Shape | null,
    setFixture: (fixture: planck.Fixture) => void,
    setShape: (shape: planck.Shape) => void
});