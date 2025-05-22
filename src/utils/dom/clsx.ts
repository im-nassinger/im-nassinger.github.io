// ~300 bytes replacement for clsx
export const clsx = (...classes: any[]) => {
    const classNames = classes.map(item => (
        typeof item === 'string' ? item.split(/\s+/) : item
    )).flat();

    const filtered = classNames.filter(Boolean);

    const unique = new Set(filtered);

    return [ ...unique ].join(' ');
};