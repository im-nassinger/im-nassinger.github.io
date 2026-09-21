import { RendererContext } from '@/contexts/PhysicsContext.ts';
import { useObjectRef } from '@/hooks/useObjectRef.ts';
import type { PhysicsRef } from '@/hooks/usePhysicsRef.ts';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PhysicsWorld } from './engine/index.ts';
import { CanvasRenderer } from './utils/CanvasRenderer.ts';
import type { CanvasRendererOptions } from './utils/CanvasRenderer.types.ts';

type RendererProps = DeepPartial<CanvasRendererOptions> & {
    children?: React.ReactNode;
    ref?: PhysicsRef<CanvasRenderer | null>;
};

export const Renderer = memo((props: RendererProps) => {
    const [world, setWorld] = useState<PhysicsWorld | null>(null);
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
