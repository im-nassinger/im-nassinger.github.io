import { CLanguage } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './CLogo.vertices.json' with { type: 'json' };

export const CLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="c"
            image={{ src: CLanguage }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});
