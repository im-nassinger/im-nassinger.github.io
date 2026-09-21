import { Espressif } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';

export const EspressifLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="espressif"
            image={{ src: Espressif }}
            shapeProps={{ type: 'circle' }}
        />
    )
});
