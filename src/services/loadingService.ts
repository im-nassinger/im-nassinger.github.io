import { getCssVar } from '@/utils/dom/getCssVar';

export async function waitForLoading() {
    await document.fonts.ready;

    const duration = parseFloat(getCssVar('--fast-duration')) * 1000;

    return new Promise((resolve) => {
        setTimeout(() => resolve(true), duration); // wait for transitions
    });
}

export function setDocumentLoading(bool: boolean) {
    document.body.toggleAttribute('data-loading', bool);
}