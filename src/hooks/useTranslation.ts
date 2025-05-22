import { useTranslation as _useTranslation } from 'react-i18next';

export function useTranslation(
    /**
     * if true, it will cause a re-render on language change.
     */
    listenChanges: boolean = true
) {
    return _useTranslation(undefined, {
        bindI18n: 'loaded' + (listenChanges ? ' languageChanged' : ''),
        bindI18nStore: listenChanges ? '' : false
    } as any);
}