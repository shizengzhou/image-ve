import { onMounted, watch } from 'vue';

import i18next, { changeLanguagePreference, initI18n } from '@shared/i18n';
import type { LanguagePreference } from '@shared/types';
import { isMac } from '../utils/platform';
import { useAppSettings } from './useAppSettings';

export const useLanguagePreference = () => {
  const {
    languagePreference,
    setLanguagePreference: setLanguagePreferenceValue,
    ensureSettingsLoaded
  } = useAppSettings();

  const syncMenuLanguage = (preference: LanguagePreference): void => {
    if (!isMac) {
      return;
    }
    window.electron.setMenuLanguage(preference);
  };

  const setLanguagePreference = async (preference: LanguagePreference): Promise<void> => {
    setLanguagePreferenceValue(preference);
    await changeLanguagePreference(preference);
    syncMenuLanguage(preference);
  };

  onMounted(async () => {
    await ensureSettingsLoaded();
    if (i18next.language !== languagePreference.value) {
      await changeLanguagePreference(languagePreference.value);
    }
    syncMenuLanguage(languagePreference.value);
  });

  watch(languagePreference, (value) => {
    void initI18n(value);
    syncMenuLanguage(value);
  });

  return {
    languagePreference,
    setLanguagePreference
  };
};
