import { BrowserWindow } from 'electron';
import Store from 'electron-store';

import { DEFAULT_SETTINGS } from '@shared/constants';
import i18next from '@shared/i18n';
import type { Settings, ThemePreference } from '@shared/types';

import { ipcWebcontentsSend } from './electron';
import { rebuildAppMenu } from './menu';
import { setTheme } from './theme';

const store = new Store<Settings>({
  name: 'settings',
  defaults: { ...DEFAULT_SETTINGS, language: '' }
});

store.onDidChange('theme', (newValue) => {
  setTheme(newValue as ThemePreference);
});

store.onDidChange('language', (newValue) => {
  if (newValue) {
    void i18next.changeLanguage(newValue);
    rebuildAppMenu();
  }
});

store.onDidAnyChange((newValue) => {
  BrowserWindow.getAllWindows().forEach((win) => {
    ipcWebcontentsSend(win.webContents, 'settings-changed', newValue);
  });
});

export const getSettings = async (): Promise<Settings> => {
  return store.store;
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  store.store = settings;
};

export const getInitialLanguage = (): string => {
  return store.get('language') || '';
};
