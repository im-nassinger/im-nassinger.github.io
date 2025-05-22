import { EasyMouseJoint, Renderer, World } from '@/components/physics';
import { CanvasRenderer } from '@/components/physics/utils/CanvasRenderer';
import { usePlanckRef } from '@/hooks/usePlanckRef';
import { useWindowSize } from '@/hooks/useWindowSize';
import { clamp } from '@/utils/math/clamp';
import { getCssVar } from '@/utils/dom/getCssVar';
import { lerp } from '@/utils/math/lerp';
import * as planck from 'planck';
import { memo, useEffect, useState } from 'react';
import { pixelsPerMeter, rackItemRadius, worldGravity } from './config';
import { Css3Logo, DenoLogo, GitHubLogo, GitLogo, Html5Logo, JavaScriptLogo, NodeLogo, ReactLogo, TypeScriptLogo, VSCodeLogo } from './logos';
import { Rack } from './Rack';
import { Walls } from './Walls';

planck.Settings.maxPolygonVertices = 50;

const getBodyPaddingVariables = () => {
    const itemSidePaddingString = getCssVar('--item-side-padding');

    if (!itemSidePaddingString.endsWith('vw')) {
        throw new Error('--item-side-padding must be in vw');
    }

    let appSidePaddingString = getCssVar('--app-side-padding'),
        appSidePadding = 0;

    if (appSidePaddingString.endsWith('vw')) {
        appSidePadding = parseFloat(appSidePaddingString);
    } else {
        const vw = window.innerWidth;
        const minVW = parseFloat(getCssVar('--min-vw'));
        const maxVW = parseFloat(getCssVar('--max-vw'));
        const minP = parseFloat(getCssVar('--min-p'));
        const maxP = parseFloat(getCssVar('--max-p'));
        const t = clamp((vw - minVW) / (maxVW - minVW), 0, 1);

        appSidePadding = lerp(minP, maxP, t);
    }

    appSidePadding = appSidePadding / 100 * window.innerWidth;

    const itemSidePadding = parseFloat(itemSidePaddingString) / 100 * window.innerWidth;

    return { itemSidePadding, appSidePadding };
};

const computeRackX = () => {
    const { itemSidePadding, appSidePadding } = getBodyPaddingVariables();
    const paddingInMeters = (appSidePadding + itemSidePadding) / pixelsPerMeter;

    const rightX = window.innerWidth / pixelsPerMeter / 2;
    const itemsAtBottom = 4;
    const rackWidth = rackItemRadius * 2 * itemsAtBottom;

    return rightX - paddingInMeters - rackWidth / 2;
};

export const Physics = memo(() => {
    const planckWorldRef = usePlanckRef<planck.World | null>(null);
    const rendererRef = usePlanckRef<CanvasRenderer | null>(null);
    const [rackX, setRackX] = useState(computeRackX());
    const windowSize = useWindowSize();

    useEffect(() => {
        const planckWorld = planckWorldRef.current;
        const renderer = rendererRef.current;

        if (!planckWorld || !renderer) return;

        const mouseJoint = new EasyMouseJoint(planckWorld, { renderer });

        mouseJoint.setupEvents();

        return () => {
            mouseJoint.removeEvents();
        };
    }, [planckWorldRef, rendererRef]);

    useEffect(() => {
        const renderer = rendererRef.current;
        if (!renderer) return;

        const newRackX = computeRackX();

        renderer.setOffset({ x: newRackX });

        setRackX(newRackX);
    }, [rendererRef, windowSize]);

    if (windowSize.width < 1200) return null;

    return (
        <>
            <Renderer
                pixelsPerMeter={pixelsPerMeter}
                ref={rendererRef}
                default={{ strokeStyle: 'transparent', lineWidth: 4 }}
            >
                <World gravity={worldGravity} bullet={true} ref={planckWorldRef}>
                    <Rack x={0} y={0} radius={rackItemRadius} suffle={false}>
                        <ReactLogo />
                        <NodeLogo />
                        <VSCodeLogo />
                        <DenoLogo />
                        <JavaScriptLogo />
                        <GitHubLogo />
                        <GitLogo />
                        <Html5Logo />
                        <Css3Logo />
                        <TypeScriptLogo />
                    </Rack>

                    <Walls offsetX={rackX} offsetY={0} />
                </World>
            </Renderer>
        </>
    );
});