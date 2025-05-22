import { Deno } from '@/assets';
import { themeState } from '@/stores/themeState';
import { memo } from 'react';
import { useSnapshot } from 'valtio';
import { themeLogoColors } from '../../config';
import { Logo, LogoProps } from '../../Logo';

export const DenoLogo = memo((props: Partial<LogoProps>) => {
    useSnapshot(themeState);

    return (
        <Logo
            {...props}
            name="deno"
            image={{
                src: Deno,
                attributes: {
                    color: themeLogoColors[themeState.theme]
                }
            }}
            shapeProps={{ type: 'circle' }}
            fixtureProps={{ restitution: 0.5 }}
        />
    )
});