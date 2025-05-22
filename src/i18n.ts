import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from '@/config/languages';

i18n.use(initReactI18next);
        
i18n.init({
    resources,
    lng: navigator.language,
    fallbackLng: 'en-US',
    interpolation: {
        escapeValue: false
    }
});

export { i18n };