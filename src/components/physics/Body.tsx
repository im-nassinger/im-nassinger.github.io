import { BodyContext, WorldContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, ReactNode, useContext, useEffect, useState } from 'react';
import type { RenderableBody, RenderableBodyDef } from './utils/CanvasRenderer.types';

type BodyProps = Partial<RenderableBodyDef> & {
    x?: number;
    y?: number;
    children: ReactNode;
    ref?: PlanckRef<planck.Body | null>;
}

export const Body = memo((props: BodyProps) => {
    const worldCtx = useContext(WorldContext);

    if (!worldCtx) {
        throw new Error('Body must be used within a <World>');
    }

    const { world } = worldCtx;
    const [body, setBody] = useState<RenderableBody | null>(null);
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const position = stableProps.position ?? new planck.Vec2(stableProps.x ?? 0, stableProps.y ?? 0);
        const bodyDef = { ...stableProps, position };

        delete bodyDef.x;
        delete bodyDef.y;

        bodyDef.bullet = bodyDef.bullet ?? world.bullet ?? false;
        
        const planckBody = world.createBody(bodyDef);

        setBody(planckBody);

        if (stableProps.ref) stableProps.ref.current = planckBody;

        return () => {
            world.destroyBody(planckBody);
        };
    }, [world, stableProps]);

    if (!body) return null;

    return (
        <BodyContext.Provider value={{ body }}>
            {props.children}
        </BodyContext.Provider>
    );
});