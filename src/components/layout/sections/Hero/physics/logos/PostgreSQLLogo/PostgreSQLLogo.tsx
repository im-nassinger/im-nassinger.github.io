import { PostgreSQL } from '@/assets';
import { memo } from 'react';
import { Logo, LogoProps } from '../../Logo';
import verticeList from './PostgreSQLLogo.vertices.json' with { type: 'json' };

// the svg is 256x264, so the image keeps its proportion inside the 1x1 logo box.
const imageWidth = 256 / 264;

export const PostgreSQLLogo = memo((props: Partial<LogoProps>) => {
    return (
        <Logo
            {...props}
            name="postgresql"
            image={{ src: PostgreSQL, width: imageWidth, height: 1 }}
            shapeProps={{ type: 'polygon', verticeList }}
        />
    )
});
