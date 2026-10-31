import type { ThemePreference } from '@shared/types';

export const resolveTheme = (preference: ThemePreference): 'light' | 'dark' => {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return preference;
};

export const applyTheme = (preference: ThemePreference): void => {
  const resolved = resolveTheme(preference);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
};
