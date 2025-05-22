import { i18n } from '@/i18n';

export function getPreferredLanguage() {
    const storedLanguage = localStorage.getItem('language') as string;
    if (storedLanguage) return storedLanguage;

    return navigator.language || 'en-US';
}

export function setDocumentLanguage(language: string) {
    i18n.changeLanguage(language);

    localStorage.setItem('language', language);
}