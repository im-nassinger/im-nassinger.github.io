import { useCallback } from 'react';

// replacement for the react-router-dom useNavigate hook.
// this doesn't cause re-renders on location change.
export function useNavigate() {
    return useCallback((to: string, { replace = false } = {}) => {
        if (replace) {
            window.history.replaceState({}, '', to);
        } else {
            window.history.pushState({}, '', to);
        }

        window.dispatchEvent(new PopStateEvent('popstate'));
    }, []);
}