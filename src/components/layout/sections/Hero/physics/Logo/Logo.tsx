import { Body, Box, Circle, Fixture, Polygon } from '@/components/physics';
import { Attributes, useMemoImage } from '@/hooks/useMemoImage';
import { useObjectRef } from '@/hooks/useObjectRef';
import { usePlanckRef } from '@/hooks/usePlanckRef';
import * as planck from 'planck';
import { ComponentProps, memo, useEffect, useRef } from 'react';

export type LogoProps = {
    x?: number;
    y?: number;
    name: string;
    image: {
        src: string;
        width?: number;
        height?: number;
        attributes?: Attributes;
    };
    bodyProps?: Partial<ComponentProps<typeof Body>>;
    fixtureProps?: Partial<ComponentProps<typeof Fixture>>;
    shapeProps: {
        type: 'circle' | 'polygon' | 'box';
        radius?: number;
        width?: number;
        height?: number;
        verticeList?: ComponentProps<typeof Polygon>['vertices'][];
    }
};

function LogoFixture(props: LogoProps) {
    const fixtureProps = {
        density: 10,
        friction: 1,
        restitution: 0.375,
        ...props.fixtureProps
    } as ComponentProps<typeof Fixture>;

    const { type, verticeList, radius, width, height } = props.shapeProps;

    if (type === 'polygon') {
        if (!verticeList) return null;

        return verticeList.map((vertices, index) => (
            <Fixture key={index} {...fixtureProps}>
                <Polygon vertices={vertices} />
            </Fixture>
        ));
    } else if (type === 'circle') {
        return (
            <Fixture {...fixtureProps}>
                <Circle radius={radius ?? 0.5} />
            </Fixture>
        )
    } else if (type === 'box') {
        return (
            <Fixture {...fixtureProps}>
                <Box
                    width={width ?? 1}
                    height={height ?? 1}
                />
            </Fixture>
        )
    }
}

export const Logo = memo((props: LogoProps) => {
    const stableProps = useObjectRef(props);
    const bodyRef = usePlanckRef<planck.Body | null>(null);

    // Baking the SVG image into a bitmap for better performance :p
    const image = useMemoImage({
        src: stableProps.image.src,
        width: stableProps.image.width ?? 1,
        height: stableProps.image.height ?? 1,
        attributes: stableProps.image.attributes
    });

    const bodyProps = useRef({
        x: stableProps.x ?? 0,
        y: stableProps.y ?? 0,
        type: 'static',
        userData: {
            name: stableProps.name,
            render: {
                image
            }
        },
        ...stableProps.bodyProps
    } as ComponentProps<typeof Body>);

    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;

        const userData = body.getUserData() as any;

        userData.render.image = image;
        bodyProps.current.userData = userData;
    }, [ bodyRef, image ]);
    
    if (!bodyProps) return null;

    return (
        <Body {...bodyProps.current} ref={bodyRef}>
            <LogoFixture {...props} />
        </Body>
    )
});