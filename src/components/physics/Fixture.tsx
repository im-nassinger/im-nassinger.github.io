import { BodyContext, FixtureContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, ReactNode, useContext, useEffect, useState } from 'react';
import { RenderableFixtureDef } from './utils/CanvasRenderer.types';

type FixtureProps = Partial<RenderableFixtureDef> & {
    children?: ReactNode;
    ref?: PlanckRef<planck.Fixture | null>;
}

export const Fixture = memo((props: FixtureProps) => {
    const bodyCtx = useContext(BodyContext);

    if (!bodyCtx) {
        throw new Error('Fixture must be used within a <Body>');
    }

    const { body } = bodyCtx;
    const [fixture, setFixture] = useState<planck.Fixture | null>(null);
    const [shape, setShape] = useState<planck.Shape | null>(null);

    const stableProps = useObjectRef(props);

    useEffect(() => {
        if (!body || !shape) return;

        const fixtureDef = { ...stableProps, shape };
        const planckFixture = body.createFixture(fixtureDef);

        setFixture(planckFixture);

        if (stableProps.ref) stableProps.ref.current = planckFixture;

        return () => {
            body.destroyFixture(planckFixture);
        };
    }, [body, shape, stableProps]);

    return (
        <FixtureContext.Provider value={{ fixture, shape, setFixture, setShape }}>
            {props.children}
        </FixtureContext.Provider>
    );
});