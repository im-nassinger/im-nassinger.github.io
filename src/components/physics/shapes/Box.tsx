import { FixtureContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, useContext, useEffect } from 'react';
import { RenderableShapeDef } from '../utils/CanvasRenderer.types';

type WidthOptions =
    | { width: number; halfWidth?: number }
    | { width?: number; halfWidth: number };

type HeightOptions =
    | { height: number; halfHeight?: number }
    | { height?: number; halfHeight: number };

// at least one of: (center), (position), (x, y).
type PositionOptions =
    | { center: planck.Vec2Value; position?: never; x?: never; y?: never }
    | { center?: never; position: planck.Vec2Value; x?: never; y?: never }
    | { center?: never; position?: never; x?: number; y?: number };

type BoxProps = Partial<RenderableShapeDef> & {
    angle?: number;
    ref?: PlanckRef<planck.BoxShape | null>;
} & WidthOptions & HeightOptions & PositionOptions;

export const Box = memo((props: BoxProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Box must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const halfWidth = stableProps.width ? stableProps.width / 2 : stableProps.halfWidth! * 2;
        const halfHeight = stableProps.height ? stableProps.height / 2 : stableProps.halfHeight! * 2;
        const position = stableProps.center ?? stableProps.position ?? new planck.Vec2(stableProps.x ?? 0, stableProps.y ?? 0);

        const planckBox = new planck.Box(halfWidth, halfHeight, position, stableProps.angle);

        if (stableProps.userData) {
            Object.assign(planckBox, {
                // only box2d v3 supports userData in shapes.
                m_userData: stableProps.userData
            });
        }

        setShape(planckBox);

        if (stableProps.ref) stableProps.ref.current = planckBox;
    }, [setShape, stableProps]);

    return null;
});