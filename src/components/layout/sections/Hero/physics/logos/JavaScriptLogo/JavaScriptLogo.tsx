import { JavaScript } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './JavaScriptLogo.vertices.json' with { type: 'json' };

export const JavaScriptLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="JavaScript"
            image={{ src: JavaScript }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});