import { EasyMouseJoint, Renderer, World } from '@/components/physics';
import type { CanvasRenderer, PhysicsWorld } from '@/components/physics';
import { usePhysicsRef } from '@/hooks/usePhysicsRef.ts';
import { registerDebugHandle } from '@/utils/profiler/profiler.ts';
import { useWindowSize } from '@/hooks/useWindowSize';
import { clamp } from '@/utils/math/clamp';
import { getCssVar } from '@/utils/dom/getCssVar';
import { lerp } from '@/utils/math/lerp';
import { memo, useEffect, useState } from 'react';
import { debugPhysics, physicsWorldOptions, pixelsPerMeter, rackItemRadius, worldGravity } from './config';
import {
    CLogo,
    Css3Logo,
    DenoLogo,
    EspressifLogo,
    GitHubLogo,
    GitLogo,
    Html5Logo,
    JavaScriptLogo,
    LuaLogo,
    NodeLogo,
    PostgreSQLLogo,
    PythonLogo,
    ReactLogo,
    TypeScriptLogo,
    VSCodeLogo
} from './logos';
import { getRackWidthFor, Rack } from './Rack';
import { Slingshot } from './Slingshot';
import { Walls } from './Walls';

// the rack fills from the bottom row up, so the first logos end up at the base of the triangle.
const rackLogos = [
    PythonLogo,
    LuaLogo,
    CLogo,
    EspressifLogo,
    PostgreSQLLogo,
    ReactLogo,
    NodeLogo,
    VSCodeLogo,
    DenoLogo,
    JavaScriptLogo,
    GitHubLogo,
    GitLogo,
    Html5Logo,
    Css3Logo,
    TypeScriptLogo
];

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
    const itemsAtBottom = getRackWidthFor(rackLogos.length);
    const rackWidth = rackItemRadius * 2 * itemsAtBottom;

    return rightX - paddingInMeters - rackWidth / 2;
};

// the world origin follows the rack, so the left edge of the content moves with it.
const computeContentLeftX = (rackX: number) => {
    const { itemSidePadding, appSidePadding } = getBodyPaddingVariables();
    const paddingInMeters = (appSidePadding + itemSidePadding) / pixelsPerMeter;

    const leftX = -window.innerWidth / pixelsPerMeter / 2;

    return leftX + paddingInMeters - rackX;
};

export const Physics = memo(() => {
    const physicsWorldRef = usePhysicsRef<PhysicsWorld | null>(null);
    const rendererRef = usePhysicsRef<CanvasRenderer | null>(null);
    const [rackX, setRackX] = useState(computeRackX());
    const windowSize = useWindowSize();

    useEffect(() => {
        const physicsWorld = physicsWorldRef.current;
        const renderer = rendererRef.current;

        if (!physicsWorld || !renderer) return;

        const mouseJoint = new EasyMouseJoint(physicsWorld, { renderer });

        mouseJoint.setupEvents();

        // lets the profiler's automated test start the simulation and keep the logos moving.
        registerDebugHandle('physicsWorld', physicsWorld);
        registerDebugHandle('physicsRenderer', renderer);

        return () => {
            mouseJoint.removeEvents();
        };
    }, [physicsWorldRef, rendererRef]);

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
                debug={debugPhysics}
                ref={rendererRef}
                default={{ strokeStyle: 'transparent', lineWidth: 4 }}
            >
                <World gravity={worldGravity} bullet={true} {...physicsWorldOptions} ref={physicsWorldRef}>
                    <Rack x={0} y={0} radius={rackItemRadius} suffle={false}>
                        {rackLogos.map((RackLogo, index) => <RackLogo key={index} />)}
                    </Rack>

                    <Walls offsetX={rackX} offsetY={0} />

                    <Slingshot contentLeftX={computeContentLeftX(rackX)} />
                </World>
            </Renderer>
        </>
    );
});