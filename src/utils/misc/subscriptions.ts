import { setDocumentLanguage } from '@/services/languageService';
import { setDocumentLoading, waitForLoading } from '@/services/loadingService';
import { setDocumentTheme } from '@/services/themeService';
import { languageState } from '@/stores/languageState';
import { loadingState, setLoading } from '@/stores/loadingState';
import { navbarState } from '@/stores/navbarState';
import { setSidebarOpen, sidebarState } from '@/stores/sidebarState';
import { themeState } from '@/stores/themeState';
import { subscribe } from 'valtio';

onStateChange(languageState, ({ language }) => {
    setDocumentLanguage(language);
});

onStateChange(loadingState, ({ isLoading }) => {
    setDocumentLoading(isLoading);
});

onStateChange(themeState, ({ theme }) => {
    setDocumentTheme(theme);
});

onStateChange(navbarState, ({ buttonsHidden }) => {
    if (!buttonsHidden && sidebarState.isOpen) {
        setSidebarOpen(false);
    }
});

function onStateChange<T extends object>(state: T, callback: (data: T) => void) {
    callback(state);
    subscribe(state, () => callback(state));
}

waitForLoading().then(() => setLoading(false));