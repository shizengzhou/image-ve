import { ref, watch } from 'vue';

import i18next from '@shared/i18n';
import type { LanguagePreference, Settings, ThemePreference } from '@shared/types';

const recursiveSubdirectories = ref(true);
const themePreference = ref<ThemePreference>('system');
const languagePreference = ref<LanguagePreference>('en');
const autoplayIntervalMs = ref(2000);
const wheelZoomStep = ref(0.1);
const settingsLoaded = ref(false);

let isInitialized = false;
let isSaving = false;
let loadPromise: Promise<void> | null = null;

const applySettings = (settings: Settings): void => {
  recursiveSubdirectories.value = settings.recursiveSubdirectories;
  themePreference.value = settings.theme as ThemePreference;
  autoplayIntervalMs.value = settings.autoplayIntervalMs ?? 2000;
  wheelZoomStep.value = settings.wheelZoomStep ?? 0.1;
  languagePreference.value =
    (settings.language as LanguagePreference) || (i18next.language as LanguagePreference);
};

const loadSettings = async (): Promise<void> => {
  const previousSaving = isSaving;
  isSaving = true;
  try {
    const settings = await window.electron.getSettings();
    applySettings(settings);
  } catch (error) {
    console.error('Failed to load settings:', error);
  } finally {
    isSaving = previousSaving;
  }
};

const saveSettings = async (): Promise<void> => {
  if (isSaving) {
    return;
  }
  isSaving = true;

  try {
    window.electron.saveSettings({
      recursiveSubdirectories: recursiveSubdirectories.value,
      theme: themePreference.value,
      language: languagePreference.value,
      autoplayIntervalMs: autoplayIntervalMs.value,
      wheelZoomStep: wheelZoomStep.value
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
  } finally {
    isSaving = false;
  }
};

export const useAppSettings = () => {
  if (!isInitialized) {
    isInitialized = true;
    loadPromise = loadSettings().finally(() => {
      settingsLoaded.value = true;
    });

    watch(
      [
        recursiveSubdirectories,
        themePreference,
        languagePreference,
        autoplayIntervalMs,
        wheelZoomStep
      ],
      () => {
        void saveSettings();
      }
    );

    window.electron.onSettingsChanged((settings) => {
      const previousSaving = isSaving;
      isSaving = true;
      applySettings(settings);
      isSaving = previousSaving;
    });
  }

  return {
    recursiveSubdirectories,
    themePreference,
    languagePreference,
    autoplayIntervalMs,
    wheelZoomStep,
    settingsLoaded,
    ensureSettingsLoaded: async (): Promise<void> => {
      if (settingsLoaded.value) {
        return;
      }
      if (loadPromise) {
        await loadPromise;
      }
    },
    setRecursiveSubdirectories: (value: boolean): void => {
      recursiveSubdirectories.value = value;
    },
    setThemePreference: (value: ThemePreference): void => {
      themePreference.value = value;
    },
    setAutoplayIntervalMs: (value: number): void => {
      autoplayIntervalMs.value = value;
    },
    setLanguagePreference: (value: LanguagePreference): void => {
      languagePreference.value = value;
    },
    setWheelZoomStep: (value: number): void => {
      wheelZoomStep.value = value;
    }
  };
};
