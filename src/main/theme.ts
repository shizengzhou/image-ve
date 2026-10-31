import { nativeTheme } from 'electron';

import type { ThemePreference } from '@shared/types';

export const setTheme = (theme: ThemePreference): void => {
  nativeTheme.themeSource = theme;
};
