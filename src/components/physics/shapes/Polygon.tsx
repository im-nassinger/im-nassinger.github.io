import { FixtureContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import { memo, useContext, useEffect } from 'react';
import type { PhysicsUserData, Vector } from '../engine/index.ts';

type PolygonProps = {
    vertices: Vector[] | Vector[][] | number[] | number[][];
    userData?: PhysicsUserData;
};

// Accepts either vector objects or flat [x, y] number pairs.
function toVectors(vertices: PolygonProps['vertices']) {
    const flatVertices = vertices.flat();
    const result: Vector[] = [];

    for (let i = 0; i < flatVertices.length; i++) {
        const item = flatVertices[i];

        if (typeof item !== 'number') {
            result.push({ x: item.x, y: item.y });
            continue;
        }

        const y = flatVertices[i + 1] as number;

        result.push({ x: item, y });
        i++;
    }

    return result;
}

export const Polygon = memo((props: PolygonProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Polygon must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        setShape({
            geometry: { type: 'polygon', vertices: toVectors(stableProps.vertices) },
            userData: stableProps.userData
        });
    }, [setShape, stableProps]);

    return null;
});
