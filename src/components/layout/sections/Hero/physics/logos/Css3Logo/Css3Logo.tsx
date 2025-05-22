import { Css3 } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './Css3Logo.vertices.json' with { type: 'json' };

export const Css3Logo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="css3"
            image={{ src: Css3 }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});