import { useCallback } from 'react';

// replacement for the react-router-dom useNavigate hook.
// this doesn't cause re-renders on location change.
export function useNavigate() {
    return useCallback((to: string, { replace = false } = {}) => {
        const fromSearch = location.href.split('?')[1];
        const toSearch = to.split('?')[1];

        const fromParams = new URLSearchParams(fromSearch);
        const toParams = new URLSearchParams(toSearch);

        const allParams = new URLSearchParams({
            ...Object.fromEntries(fromParams.entries()),
            ...Object.fromEntries(toParams.entries())
        });

        if (allParams.toString()) {
            to = to.split('?')[0] + '?' + allParams.toString();
        }

        if (replace) {
            window.history.replaceState({}, '', to);
        } else {
            window.history.pushState({}, '', to);
        }

        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);
}