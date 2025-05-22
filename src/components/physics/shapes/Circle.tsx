import { FixtureContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, useContext, useEffect } from 'react';
import { RenderableShapeDef } from '../utils/CanvasRenderer.types';

type CircleProps = Partial<RenderableShapeDef> & {
    x?: number;
    y?: number;
    position?: planck.Vec2Value;
    radius?: number;
    ref?: PlanckRef<planck.CircleShape | null>;
}

export const Circle = memo((props: CircleProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Circle must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const position = stableProps.position ?? new planck.Vec2(stableProps.x ?? 0, stableProps.y ?? 0);

        const planckCircle = new planck.Circle(position, stableProps.radius);

        if (stableProps.userData) {
            Object.assign(planckCircle, {
                // only box2d v3 supports userData in shapes.
                m_userData: stableProps.userData
            });
        }

        setShape(planckCircle);

        if (stableProps.ref) stableProps.ref.current = planckCircle;
    }, [setShape, stableProps]);

    return null;
});