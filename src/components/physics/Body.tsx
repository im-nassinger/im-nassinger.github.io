import { BodyContext, WorldContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import type { PhysicsRef } from '@/hooks/usePhysicsRef.ts';
import { memo, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { BodyOptions, PhysicsBody } from './engine/index.ts';

type BodyProps = BodyOptions & {
    x?: number;
    y?: number;
    children: ReactNode;
    ref?: PhysicsRef<PhysicsBody | null>;
};

export const Body = memo((props: BodyProps) => {
    const worldCtx = useContext(WorldContext);

    if (!worldCtx) {
        throw new Error('Body must be used within a <World>');
    }

    const { world } = worldCtx;
    const [body, setBody] = useState<PhysicsBody | null>(null);
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const { type, angle, bullet, enableSleep, userData } = stableProps;
        const position = stableProps.position ?? { x: stableProps.x ?? 0, y: stableProps.y ?? 0 };

        const physicsBody = world.createBody({ type, position, angle, bullet, enableSleep, userData });

        setBody(physicsBody);

        if (stableProps.ref) stableProps.ref.current = physicsBody;

        return () => {
            world.destroyBody(physicsBody);
        };
    }, [world, stableProps]);

    if (!body) return null;

    return (
        <BodyContext.Provider value={{ body }}>
            {props.children}
        </BodyContext.Provider>
    );
});
