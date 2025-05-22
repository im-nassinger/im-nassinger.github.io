import { Node } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './NodeLogo.vertices.json' with { type: 'json' };

export const NodeLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="Node.js"
            image={{ src: Node }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});