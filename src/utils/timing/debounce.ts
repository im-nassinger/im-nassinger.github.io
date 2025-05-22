export const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
    
        timeout = setTimeout(() => {
            func(...args);
        }, wait);
    };
};