import { proxy } from 'valtio';

export const loadingState = proxy({
    isLoading: true
});

export const setLoading = (loading: boolean) => loadingState.isLoading = loading;