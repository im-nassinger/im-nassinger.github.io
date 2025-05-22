export const getCurrentLocation = () => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash.split('?')[0]
});