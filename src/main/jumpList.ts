import { app, type JumpListCategory, type JumpListItem } from 'electron';
import { basename } from 'node:path';

import i18next from '@shared/i18n';
import type { RecentItem } from '@shared/types';

import { removeRecentItemsFromHistory } from './recentItems';

// Windows only renders a handful of custom Jump List entries.
const MAX_JUMP_LIST_ITEMS = 7;

const parseTaskPath = (args: string | undefined): string | null => {
  if (!args) {
    return null;
  }
  const trimmed = args.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed.length > 0 ? trimmed : null;
};

const buildTask = (item: RecentItem): JumpListItem => ({
  type: 'task',
  title: basename(item.path).slice(0, 255),
  description: item.path.slice(0, 260),
  program: process.execPath,
  args: `"${item.path}"`,
  iconPath: item.isDirectory ? 'explorer.exe' : process.execPath,
  iconIndex: 0
});

/**
 * Mirrors what VS Code does on Windows: it keeps its own recent history and
 * publishes it as a custom Jump List category, so folders can appear too (the
 * system "recent" category only shows files with registered associations).
 */
export const updateWindowsJumpList = (items: RecentItem[]): void => {
  if (process.platform !== 'win32') {
    return;
  }

  const removedPaths = new Set(
    app
      .getJumpListSettings()
      .removedItems.map((item) => parseTaskPath(item.args))
      .filter((path): path is string => path !== null)
  );
  if (removedPaths.size > 0) {
    // Drop entries the user removed through the taskbar Jump List.
    removeRecentItemsFromHistory(removedPaths);
  }

  const visibleItems = items
    .filter((item) => !removedPaths.has(item.path))
    .slice(0, MAX_JUMP_LIST_ITEMS);

  const categories: JumpListCategory[] = [];
  if (visibleItems.length > 0) {
    categories.push({
      type: 'custom',
      name: i18next.t('empty.recentTitle'),
      items: visibleItems.map(buildTask)
    });
  }

  try {
    const result = app.setJumpList(categories);
    if (result && result !== 'ok') {
      console.warn(`updateWindowsJumpList failed: ${result}`);
    }
  } catch (error) {
    console.warn('updateWindowsJumpList failed', error);
  }
};
