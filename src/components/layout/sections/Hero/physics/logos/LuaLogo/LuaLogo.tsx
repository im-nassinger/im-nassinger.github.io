import { Lua } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import type { LogoCircle } from '../../Logo';

// the planet and the moon of the logo, measured from the svg (viewBox 256x256).
// the dotted orbit is decorative and has no collision.
const circleList: LogoCircle[] = [
    { x: 0, y: 0, radius: 0.3823 },
    { x: 0.3822, y: -0.3822, radius: 0.112 }
];

export const LuaLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="lua"
            image={{ src: Lua }}
            shapeProps={{ type: 'circle', circleList }}
        />
    )
});
