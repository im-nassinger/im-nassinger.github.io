import { Sparkles } from '@/assets';
import { useEffect, useRef } from 'react';
import { BackgroundEffectRenderer } from './BackgroundEffectRenderer.ts';
import './BackgroundEffect.css';

export function BackgroundEffect() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) return;

        const sparklesImg = new Image();

        sparklesImg.src = Sparkles;

        const shimmer = new BackgroundEffectRenderer(
            {
                shaderCanvas: canvas,
                sparklesSvg: sparklesImg
            }
        );

        shimmer.startAnimation();

        return () => {
            shimmer.destroy();
        };
    }, [canvasRef]);

    return (
        <canvas id="background-canvas" ref={canvasRef}></canvas>
    )
}