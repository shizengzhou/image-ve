import i18next from 'i18next';

import type { Language, LanguagePreference } from '../types';
import de from './resources/de';
import en from './resources/en';
import fr from './resources/fr';
import it from './resources/it';
import ja from './resources/ja';
import ko from './resources/ko';
import ru from './resources/ru';
import zhCN from './resources/zh-CN';
import zhTW from './resources/zh-TW';

const resources = {
  de,
  en,
  fr,
  it,
  ja,
  ko,
  ru,
  'zh-CN': zhCN,
  'zh-TW': zhTW
};

export const initI18n = async (lng: LanguagePreference | string): Promise<void> => {
  if (i18next.isInitialized) {
    await i18next.changeLanguage(lng);
    return;
  }

  await i18next.init({
    resources,
    lng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });
};

export const changeLanguagePreference = async (
  preference: LanguagePreference
): Promise<LanguagePreference> => {
  await i18next.changeLanguage(preference);
  return preference;
};

export const getLanguage = (locale: string): LanguagePreference => {
  if (!locale) {
    return 'en';
  }

  const value = locale.toLowerCase();

  if (value.startsWith('zh-hant') || value.startsWith('zh-tw') || value.startsWith('zh-hk')) {
    return 'zh-TW';
  }

  if (value.startsWith('zh')) {
    return 'zh-CN';
  }

  if (value.startsWith('de')) {
    return 'de';
  }

  if (value.startsWith('fr')) {
    return 'fr';
  }

  if (value.startsWith('it')) {
    return 'it';
  }

  if (value.startsWith('ja')) {
    return 'ja';
  }

  if (value.startsWith('ko')) {
    return 'ko';
  }

  if (value.startsWith('ru')) {
    return 'ru';
  }

  return 'en';
};

export const LANGUAGES: readonly Language[] = [
  { value: 'de', name: 'Deutsch' },
  { value: 'en', name: 'English' },
  { value: 'fr', name: 'Français' },
  { value: 'it', name: 'Italiano' },
  { value: 'ja', name: '日本語' },
  { value: 'ko', name: '한국어' },
  { value: 'ru', name: 'Русский' },
  { value: 'zh-CN', name: '简体中文' },
  { value: 'zh-TW', name: '繁體中文' }
];

export default i18next;
