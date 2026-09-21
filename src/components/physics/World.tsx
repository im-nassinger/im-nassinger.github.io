import { RendererContext, WorldContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import type { PhysicsRef } from '@/hooks/usePhysicsRef.ts';
import { memo, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { PhysicsWorld } from './engine/index.ts';
import type { Vector, WorldOptions } from './engine/index.ts';

type WorldProps = Omit<WorldOptions, 'gravity'> & {
    gravity?: Vector | number;
    children: ReactNode;
    ref?: PhysicsRef<PhysicsWorld | null>;
};

export const World = memo((props: WorldProps) => {
    const rendererCtx = useContext(RendererContext);
    const stableProps = useObjectRef(props);

    const setRendererWorld = rendererCtx?.setWorld;
    const [ world, setWorld ] = useState<PhysicsWorld | null>(null);

    useEffect(() => {
        const { gravity, children: _children, ref: _ref, ...worldOptions } = stableProps;
        const gravityVector = typeof gravity === 'number' ? { x: 0, y: gravity } : gravity;

        let cancelled = false;
        let createdWorld: PhysicsWorld | null = null;

        PhysicsWorld.create({ ...worldOptions, gravity: gravityVector }).then((physicsWorld) => {
            if (cancelled) {
                physicsWorld.destroy();
                return;
            }

            createdWorld = physicsWorld;

            setWorld(physicsWorld);
            setRendererWorld(physicsWorld);

            if (stableProps.ref) stableProps.ref.current = physicsWorld;
        }).catch((error) => {
            console.error('Failed to load the physics engine.', error);
        });

        return () => {
            cancelled = true;

            setWorld(null);
            setRendererWorld(null);

            createdWorld?.destroy();
        };
    }, [setRendererWorld, stableProps]);

    if (!world) return null;

    return (
        <WorldContext.Provider value={{ world }}>
            {props.children}
        </WorldContext.Provider>
    );
});
