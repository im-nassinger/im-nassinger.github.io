export const getRootFontSize = () => {
    const style = getComputedStyle(document.documentElement);
    return style.fontSize ? parseFloat(style.fontSize) : 16;
};