import { RendererContext, World as PlanckWorld, WorldContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, ReactNode, useContext, useEffect, useState } from 'react';

type WorldProps = Omit<Partial<planck.WorldDef>, 'gravity'> & {
    gravity?: planck.Vec2Value | number;
    bullet?: boolean;
    children: ReactNode;
    ref?: PlanckRef<planck.World | null>;
}

export const World = memo((props: WorldProps) => {
    const rendererCtx = useContext(RendererContext);
    const stableProps = useObjectRef(props);

    const setRendererWorld = rendererCtx?.setWorld;
    const [ world, setWorld ] = useState<planck.World | null>(null);

    useEffect(() => {
        let { gravity, bullet } = stableProps;

        if (typeof gravity === 'number') {
            gravity = new planck.Vec2(0, gravity);
        }

        const worldDef = { ...stableProps, gravity };
        const planckWorld: PlanckWorld = new planck.World(worldDef);

        planckWorld.bullet = bullet ?? false;

        setWorld(planckWorld);
        setRendererWorld(planckWorld);

        if (stableProps.ref) stableProps.ref.current = planckWorld;

        return () => {
            setWorld(null);
            setRendererWorld(null);
        };
    }, [setRendererWorld, stableProps]);

    if (!world) return null;

    return (
        <WorldContext.Provider value={{ world }}>
            {props.children}
        </WorldContext.Provider>
    );
});