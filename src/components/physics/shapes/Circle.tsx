import { FixtureContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import { memo, useContext, useEffect } from 'react';
import type { PhysicsUserData, Vector } from '../engine/index.ts';

type CircleProps = {
    x?: number;
    y?: number;
    position?: Vector;
    radius?: number;
    userData?: PhysicsUserData;
};

export const Circle = memo((props: CircleProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Circle must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const center = stableProps.position ?? { x: stableProps.x ?? 0, y: stableProps.y ?? 0 };
        const radius = stableProps.radius ?? 1;

        setShape({
            geometry: { type: 'circle', center, radius },
            userData: stableProps.userData
        });
    }, [setShape, stableProps]);

    return null;
});
