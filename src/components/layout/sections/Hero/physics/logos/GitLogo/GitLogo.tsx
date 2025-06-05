import { Git } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './GitLogo.vertices.json' with { type: 'json' };

export const GitLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="git"
            image={{ src: Git }}
            shapeProps={{ type: 'polygon', verticeList }}
            bodyProps={{ angle: Math.PI / 4 }}
        />
    )
});