import { FixtureContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import { memo, useContext, useEffect } from 'react';
import { makeBoxVertices } from '../engine/index.ts';
import type { PhysicsUserData, Vector } from '../engine/index.ts';

type WidthOptions =
    | { width: number; halfWidth?: number }
    | { width?: number; halfWidth: number };

type HeightOptions =
    | { height: number; halfHeight?: number }
    | { height?: number; halfHeight: number };

// at least one of: (center), (position), (x, y).
type PositionOptions =
    | { center: Vector; position?: never; x?: never; y?: never }
    | { center?: never; position: Vector; x?: never; y?: never }
    | { center?: never; position?: never; x?: number; y?: number };

type BoxProps = {
    angle?: number;
    userData?: PhysicsUserData;
} & WidthOptions & HeightOptions & PositionOptions;

export const Box = memo((props: BoxProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Box must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const halfWidth = stableProps.width ? stableProps.width / 2 : stableProps.halfWidth!;
        const halfHeight = stableProps.height ? stableProps.height / 2 : stableProps.halfHeight!;
        const center = stableProps.center ?? stableProps.position ?? { x: stableProps.x ?? 0, y: stableProps.y ?? 0 };

        const vertices = makeBoxVertices(halfWidth, halfHeight, center, stableProps.angle);

        setShape({
            geometry: { type: 'polygon', vertices },
            userData: stableProps.userData
        });
    }, [setShape, stableProps]);

    return null;
});
