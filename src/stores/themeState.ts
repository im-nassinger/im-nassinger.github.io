import { ThemeName, themes } from '@/config/themes';
import { getPreferredTheme } from '@/services/themeService';
import { proxy } from 'valtio';

export const themeState = proxy({
    theme: getPreferredTheme() as ThemeName
});

export const getTheme = () => themeState.theme;
export const setTheme = (theme: ThemeName) => themeState.theme = theme;
export const getThemeIndex = () => themes.indexOf(themeState.theme);
export const getNextTheme = () => themes[(getThemeIndex() + 1) % themes.length];
export const toggleTheme = () => setTheme(getNextTheme());