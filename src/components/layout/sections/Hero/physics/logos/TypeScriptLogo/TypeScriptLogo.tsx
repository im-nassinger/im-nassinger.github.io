import { TypeScript } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './TypeScriptLogo.vertices.json' with { type: 'json' };

export const TypeScriptLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="TypeScript"
            image={{ src: TypeScript }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});