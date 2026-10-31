import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './assets/main.css';

import I18NextVue from 'i18next-vue';
import { createApp } from 'vue';

import i18next, { getLanguage, initI18n } from '@shared/i18n';
import type { Settings, ThemePreference } from '@shared/types';
import App from './App.vue';
import router from './router';
import { applyTheme } from './utils/theme';

const bootstrap = async (): Promise<void> => {
  let settings: Settings | null = null;
  let locale = 'en';

  try {
    settings = await window.electron.getSettings();
    locale = await window.electron.getLocale();
  } catch {
    // Settings unavailable — fall back to defaults
  }

  const language = settings?.language || getLanguage(locale);
  await initI18n(language);

  applyTheme((settings?.theme as ThemePreference) || 'system');

  const app = createApp(App);
  app.use(I18NextVue, { i18next });
  app.use(router);
  app.mount('#app');
};

void bootstrap();
