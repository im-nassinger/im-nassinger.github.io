import { FixtureContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, useContext, useEffect } from 'react';
import { RenderableShapeDef } from '../utils/CanvasRenderer.types';

type PolygonProps = Partial<RenderableShapeDef> & {
    vertices: planck.Vec2Value[] | planck.Vec2Value[][] | number[] | number[][];
    ref?: PlanckRef<planck.PolygonShape | null>;
}

export const Polygon = memo((props: PolygonProps) => {
    const fixtureCtx = useContext(FixtureContext);

    if (!fixtureCtx) {
        throw new Error('Polygon must be used within a <Fixture>');
    }

    const { setShape } = fixtureCtx;
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const flatVertices = stableProps.vertices.flat();
        const vertices: planck.Vec2Value[] = [];

        for (let i = 0; i < flatVertices.length; i ++) {
            let currItem = flatVertices[i],
                nextItem = flatVertices[i + 1],
                x = 0, y = 0;

            if (typeof currItem === 'number') {
                x = currItem as number;
                y = nextItem as number;
                i ++;
            } else {
                x = currItem.x;
                y = currItem.y;
            }

            vertices.push(new planck.Vec2(x, y));
        }

        const planckPolygon = new planck.PolygonShape(vertices);

        if (stableProps.userData) {
            Object.assign(planckPolygon, {
                // only box2d v3 supports userData in shapes.
                m_userData: stableProps.userData
            });
        }

        setShape(planckPolygon);

        if (stableProps.ref) stableProps.ref.current = planckPolygon;
    }, [setShape, stableProps]);

    return null;
});