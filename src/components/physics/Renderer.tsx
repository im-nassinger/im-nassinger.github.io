import { RendererContext } from '@/contexts/PhysicsContext';
import { useObjectRef } from '@/hooks/useObjectRef';
import { PlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasRenderer } from './utils/CanvasRenderer';
import { CanvasRendererOptions } from './utils/CanvasRenderer.types';

type RendererProps = DeepPartial<CanvasRendererOptions> & {
    children?: React.ReactNode;
    ref?: PlanckRef<CanvasRenderer | null>;
}

export const Renderer = memo((props: RendererProps) => {
    const [world, setWorld] = useState<planck.World | null>(null);
    const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stableProps = useObjectRef(props);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !world) return;

        const renderer = new CanvasRenderer(canvas, stableProps);

        renderer.animate(world);

        if (stableProps.ref) stableProps.ref.current = renderer;

        setRenderer(renderer);

        return () => renderer.destroy();
    }, [world, stableProps]);

    const memoWorld = useMemo(() => ({
        renderer,
        world,
        setWorld
    }), [world, renderer]);

    return (
        <RendererContext.Provider value={memoWorld}>
            <canvas id="physics-canvas" ref={canvasRef} />
            {props.children}
        </RendererContext.Provider>
    );
});