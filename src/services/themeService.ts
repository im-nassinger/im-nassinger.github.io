import { getCssVar } from '@/utils/dom/getCssVar';

let transitionTimeout: ReturnType<typeof setTimeout>;

export function getPreferredTheme() {
    const storedTheme = localStorage.getItem('theme') as string;
    if (storedTheme) return storedTheme;

    const { matches } = window.matchMedia('(prefers-color-scheme: light)');
    return matches ? 'light' : 'dark';
}

export function setDocumentTheme(theme: string, withTransition = true) {
    document.body.dataset.theme = theme;

    localStorage.setItem('theme', theme);

    if (withTransition) applyTransition();
}

export function applyTransition() {
    document.body.toggleAttribute('data-changing-theme', true);

    clearTimeout(transitionTimeout);

    const duration = parseFloat(getCssVar('--slow-duration')) * 1000;

    transitionTimeout = setTimeout(() => {
        document.body.toggleAttribute('data-changing-theme', false);
    }, duration);
}