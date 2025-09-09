import { useCallback } from 'react';

// replacement for the react-router-dom useNavigate hook.
// this doesn't cause re-renders on location change.
export function useNavigate() {
    return useCallback((to: string, { replace = false } = {}) => {
        const [ _fromHref, fromSearch ] = window.location.href.split('?');
        const [ toHref, toSearch ] = to.split('?');

        const fromParams = new URLSearchParams(fromSearch);
        const toParams = new URLSearchParams(toSearch);
        const allParams = new URLSearchParams();

        for (const [key, value] of fromParams) {
            allParams.set(key, value);
        }

        for (const [key, value] of toParams) {
            allParams.set(key, value);
        }

        const finalSearch = allParams.toString();
        const finalUrl = finalSearch ? `${toHref}?${finalSearch}` : toHref;

        if (replace) {
            window.history.replaceState({}, '', finalUrl);
        } else {
            window.history.pushState({}, '', finalUrl);
        }

        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);
}