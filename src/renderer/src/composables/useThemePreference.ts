import { onBeforeUnmount, onMounted, watch } from 'vue';

import type { ThemePreference } from '@shared/types';
import { applyTheme } from '../utils/theme';
import { useAppSettings } from './useAppSettings';

export const useThemePreference = () => {
  const { themePreference, setThemePreference: setThemePreferenceValue } = useAppSettings();
  let mediaQuery: MediaQueryList | null = null;

  const setThemePreference = (preference: ThemePreference): void => {
    setThemePreferenceValue(preference);
    applyTheme(preference);
  };

  const handleSystemChange = (): void => {
    if (themePreference.value === 'system') {
      applyTheme('system');
    }
  };

  onMounted(() => {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleSystemChange);
  });

  onBeforeUnmount(() => {
    mediaQuery?.removeEventListener('change', handleSystemChange);
  });

  watch(themePreference, (value) => {
    applyTheme(value);
  });

  return {
    themePreference,
    setThemePreference
  };
};
