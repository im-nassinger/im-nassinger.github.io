import { React } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './ReactLogo.vertices.json' with { type: 'json' };

export const ReactLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="React"
            image={{ src: React }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});