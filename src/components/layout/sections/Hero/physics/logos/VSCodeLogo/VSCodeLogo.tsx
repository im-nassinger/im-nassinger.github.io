import { VSCode } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './VSCodeLogo.vertices.json' with { type: 'json' };

export const VSCodeLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="VSCode"
            image={{ src: VSCode }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});