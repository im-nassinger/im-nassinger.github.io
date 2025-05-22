import { Body, Box, Fixture } from '@/components/physics';
import { RendererBounds } from '@/components/physics/utils/CanvasRenderer.types';
import { RendererContext } from '@/contexts/PhysicsContext';
import { debounce } from '@/utils/timing/debounce';
import { memo, useContext, useEffect, useState } from 'react';
import { wallThickness } from './config';

export type WallProps = {
    offsetX?: number;
    offsetY?: number;
};

export const Walls = memo((props: WallProps) => {
    const rendererCtx = useContext(RendererContext);

    if (!rendererCtx) {
        throw new Error('Walls must be used within a <Renderer>');
    }

    const { renderer } = rendererCtx;
    const [bounds, setBounds] = useState<RendererBounds | null>(null);

    useEffect(() => {
        if (!renderer) return;

        const initialBounds = renderer.calculateBounds();

        setBounds(initialBounds);

        const setBoundsX = () => {
            const newBounds = renderer.calculateBounds();

            setBounds((oldBounds) => ({
                minX: newBounds.minX,
                minY: oldBounds!.minY,
                maxX: newBounds.maxX,
                maxY: oldBounds!.maxY,
                width: newBounds.width,
                height: oldBounds!.height,
                halfWidth: newBounds.halfWidth,
                halfHeight: oldBounds!.halfHeight
            }));
        };

        const setBoundsDebounced = debounce(() => {
            const newBounds = renderer.calculateBounds();
            setBounds(newBounds);
        }, 250);

        const onResize = () => {
            setBoundsX();
            setBoundsDebounced();
        };

        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
        };
    }, [renderer]);

    if (!bounds) return null;

    const offsetX = -(props.offsetX ?? 0);
    const offsetY = -(props.offsetY ?? 0);

    return (
        <Body type="static" userData={{ render: { hidden: true, strokeStyle: 'red' } }}>
            <Fixture friction={0.25}>
                <Box
                    x={offsetX}
                    y={offsetY + bounds.maxY + wallThickness / 2}
                    width={bounds.width + wallThickness}
                    height={wallThickness}
                />
            </Fixture>
            <Fixture friction={0.25}>
                <Box
                    x={offsetX}
                    y={offsetY + bounds.minY - wallThickness}
                    width={bounds.width + wallThickness}
                    height={wallThickness}
                />
            </Fixture>
            <Fixture friction={0.25}>
                <Box
                    x={offsetX + bounds.minX - wallThickness / 2}
                    y={offsetY}
                    width={wallThickness}
                    height={bounds.height + wallThickness}
                />
            </Fixture>
            <Fixture friction={0.25}>
                <Box
                    x={offsetX + bounds.maxX + wallThickness / 2}
                    y={offsetY}
                    width={wallThickness}
                    height={bounds.height + wallThickness}
                />
            </Fixture>
        </Body>
    )
});