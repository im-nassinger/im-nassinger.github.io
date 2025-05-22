import { Button, Section, Text } from '@/components/ui';
import { BackgroundEffect } from '@/components/ui/BackgroundEffect';
import { SmoothScrollContext } from '@/contexts/SmoothScrollContext';
import { useNavigate } from '@/hooks/router';
import { clsx } from '@/utils/dom/clsx';
import { useContext } from 'react';
import './Hero.css';
import { Physics } from './physics/Physics';

export function HeroTexts() {
    const scrollCtx = useContext(SmoothScrollContext);
    const navigate = useNavigate();

    if (!scrollCtx) {
        throw new Error('HeroTexts must be used within a <SmoothScrollContext>');
    }

    const { scrollTo } = scrollCtx;

    return (
        <div className="left-container">
            <div className="texts">
                <Text className="message" i18n="hero.message"></Text>
                <Text className="name">Nassinger</Text>
                <Text className="role" i18n="hero.role"></Text>
                <Text className="description" i18n="hero.description"></Text>
            </div>
            <div className="buttons">
                <Button
                    className="send-message-btn"
                    i18n="hero.sendMessage"
                    onClick={() => {
                        navigate('#contact', { replace: true });
                        scrollTo(`[data-id="contact"]`);
                    }}
                ></Button>
                <Button
                    className="see-projects-btn"
                    i18n="hero.seeProjects"
                    onClick={() => {
                        navigate('#projects', { replace: true });
                        scrollTo(`[data-id="projects"]`);
                    }}
                ></Button>
            </div>
        </div>
    )
}

export function Hero() {
    // firefox has lag issues with the background effect.
    // it seems to be related to the gradients.
    // for now, only chromium based browsers will have the background effect.
    const isChromium = !!(window as any).chrome;

    return (
        <Section className={clsx('hero', isChromium && 'chrome-version')} id="start" fullscreen={true}>
            <HeroTexts />
            <Physics />
            {isChromium && <BackgroundEffect />}
        </Section>
    )
}