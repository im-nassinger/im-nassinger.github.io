import { BodyContext, FixtureContext } from '@/contexts/PhysicsContext.ts';
import type { ShapeDescriptor } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import type { PhysicsRef } from '@/hooks/usePhysicsRef.ts';
import { memo, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { PhysicsShape, PhysicsUserData, ShapeMaterial } from './engine/index.ts';

type FixtureProps = ShapeMaterial & {
    userData?: PhysicsUserData;
    children?: ReactNode;
    ref?: PhysicsRef<PhysicsShape | null>;
};

// Box2D v3 has no fixtures: this component turns its material and its child shape into box2d shapes.
export const Fixture = memo((props: FixtureProps) => {
    const bodyCtx = useContext(BodyContext);

    if (!bodyCtx) {
        throw new Error('Fixture must be used within a <Body>');
    }

    const { body } = bodyCtx;
    const [shape, setShape] = useState<PhysicsShape | null>(null);
    const [descriptor, setDescriptor] = useState<ShapeDescriptor | null>(null);

    const stableProps = useObjectRef(props);

    useEffect(() => {
        if (!body || !descriptor) return;

        const { density, friction, restitution } = stableProps;
        const userData = { ...stableProps.userData, ...descriptor.userData };

        const physicsShape = body.createShape(descriptor.geometry, { density, friction, restitution }, userData);

        setShape(physicsShape);

        if (stableProps.ref) stableProps.ref.current = physicsShape;

        return () => {
            body.destroyShape(physicsShape);
        };
    }, [body, descriptor, stableProps]);

    return (
        <FixtureContext.Provider value={{ shape, setShape: setDescriptor }}>
            {props.children}
        </FixtureContext.Provider>
    );
});
