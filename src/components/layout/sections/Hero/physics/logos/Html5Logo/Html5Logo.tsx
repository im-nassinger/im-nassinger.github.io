import { Html5 } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './Html5Logo.vertices.json' with { type: 'json' };

export const Html5Logo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="html5"
            image={{ src: Html5 }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});