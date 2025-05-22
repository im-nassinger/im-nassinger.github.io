import { GitHub } from '@/assets';
import { themeState } from '@/stores/themeState';
import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { themeLogoColors } from '../../config';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './GitHubLogo.vertices.json' with { type: 'json' };

export const GitHubLogo = memo((props: Partial<LogoProps>) => {
    useSnapshot(themeState);

    return (
        <Logo
            {...props}
            name="github"
            image={{
                src: GitHub,
                attributes: {
                    color: themeLogoColors[themeState.theme]
                }
            }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});