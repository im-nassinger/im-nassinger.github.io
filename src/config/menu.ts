import { LanguageFlag } from '@/components/ui';
import { getNextLanguage, languageState, toggleLanguage } from '@/stores/languageState';
import { getNextTheme, themeState, toggleTheme } from '@/stores/themeState';
import { Languages, Moon, Sun, SunMoon } from 'lucide-react';
import { createElement } from 'react';

export const linkButtons = [{
    i18n: 'nav.buttons.start',
    href: '#start'
}, {
    i18n: 'nav.buttons.about',
    href: '#about'
}, {
    i18n: 'nav.buttons.projects',
    href: '#projects'
}, {
    i18n: 'nav.buttons.extras',
    href: '#extras'
}, {
    i18n: 'nav.buttons.contact',
    href: '#contact'
}];

const UsFlag = (props: any) => {
    return createElement(LanguageFlag, { emoji: '🇺🇸', ...props });
};

const BrFlag = (props: any) => {
    return createElement(LanguageFlag, { emoji: '🇧🇷', ...props });
};

const languageIcons = {
    'en-US': UsFlag,
    'pt-BR': BrFlag
};

const themeIcons = {
    dark: Moon,
    light: Sun
};

export const iconButtons = [{
    className: 'language-button',
    titleKey: 'nav.changeLanguage',
    icons: languageIcons,
    state: languageState,

    get activeIcon() {
        const nextLanguage = getNextLanguage();
        return languageIcons[nextLanguage] || Languages;
    },

    onClick: () => toggleLanguage()
}, {
    className: 'theme-button',
    titleKey: 'nav.changeTheme',
    icons: themeIcons,
    state: themeState,

    get activeIcon() {
        const nextTheme = getNextTheme();
        return themeIcons[nextTheme] || SunMoon;
    },

    onClick: () => toggleTheme()
}];