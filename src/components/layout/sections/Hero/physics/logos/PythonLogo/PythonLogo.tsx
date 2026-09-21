import { Python } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './PythonLogo.vertices.json' with { type: 'json' };

export const PythonLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="python"
            image={{ src: Python }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});
