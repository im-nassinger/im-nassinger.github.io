import { LanguageName, languages } from '@/config/languages';
import { getPreferredLanguage } from '@/services/languageService';
import { proxy } from 'valtio';

export const languageState = proxy({
    language: getPreferredLanguage() as LanguageName
});

export const getLanguage = () => languageState.language;
export const setLanguage = (language: LanguageName) => languageState.language = language;
export const getLanguageIndex = () => languages.indexOf(languageState.language);
export const getNextLanguage = () => languages[(getLanguageIndex() + 1) % languages.length];
export const toggleLanguage = () => setLanguage(getNextLanguage());