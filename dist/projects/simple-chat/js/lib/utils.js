export const cleanString = (string) => 
    string
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '')
        .toLowerCase()
        .trim();

export const pad = (value, length = 2, char = '0') => value.toString().padStart(length, char);

export const nextTick = (callback) => requestAnimationFrame(callback);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sanitizeHTML = (html) => {
    const element = document.createElement('div');
    element.textContent = html;
    return element.innerHTML;
};

export const parseEmojis = (element) => {
    if (typeof twemoji === 'undefined') return;

    twemoji.parse(element, {
        folder: 'svg',
        ext: '.svg'
    });
};