export const themes = ['light', 'dark'] as const;

export type ThemeName = typeof themes[number];