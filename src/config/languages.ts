import enUS from '@/locales/en-US.json' with { type: 'json' };
import ptBR from '@/locales/pt-BR.json' with { type: 'json' };

export const resources = {
    'en-US': { translation: enUS },
    'pt-BR': { translation: ptBR }
} as const;

export const languages = Object.keys(resources) as LanguageName[];
export type LanguageName = keyof typeof resources;