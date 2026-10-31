import { app } from 'electron';
import fs from 'node:fs';
import { join } from 'node:path';

import type { RecentItem } from '@shared/types';

const MAX_RECENT_ITEMS = 20;

// macOS keeps a per-app recent-documents list that can be read back through
// app.getRecentDocuments(). On Windows the same API returns the system-wide
// "Recent" folder (including other apps' files), so the app keeps its own list
// there and only writes to the Jump List. Linux has no OS API at all.
const canReadOsRecentDocuments = process.platform === 'darwin';
const canWriteOsRecentDocuments = process.platform === 'darwin' || process.platform === 'win32';

const getRecentItemsPath = (): string => join(app.getPath('userData'), 'recent_items.json');

const normalizePath = (path: string): string => path.replace(/[\\/]+$/, '');

const loadLocalRecentItems = (): RecentItem[] => {
  const path = getRecentItemsPath();
  if (!fs.existsSync(path)) {
    return [];
  }

  try {
    const content = fs.readFileSync(path, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLocalRecentItems = (items: RecentItem[]): void => {
  const path = getRecentItemsPath();
  fs.writeFileSync(path, JSON.stringify(items, null, 2), 'utf-8');
};

const getLocalRecentItems = (): RecentItem[] => {
  const items = loadLocalRecentItems();

  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    const normalized = normalizePath(item.path);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });

  deduped.sort((a, b) => b.timestamp - a.timestamp);

  const originalLength = deduped.length;
  const existing = deduped.filter((item) => fs.existsSync(item.path));

  if (existing.length !== originalLength) {
    saveLocalRecentItems(existing);
  }

  return existing;
};

const getOsRecentItems = async (): Promise<RecentItem[]> => {
  const documents = app.getRecentDocuments();
  const results = await Promise.all(
    documents.map(async (path, index) => {
      try {
        const stat = await fs.promises.stat(path);
        return {
          path,
          isDirectory: stat.isDirectory(),
          timestamp: documents.length - index
        } satisfies RecentItem;
      } catch {
        return null;
      }
    })
  );

  return results.filter((item): item is RecentItem => item !== null);
};

export const getRecentItems = async (): Promise<RecentItem[]> => {
  if (canReadOsRecentDocuments) {
    return getOsRecentItems();
  }
  return getLocalRecentItems();
};

export const addRecentItem = (path: string, isDirectory: boolean): void => {
  if (canWriteOsRecentDocuments) {
    app.addRecentDocument(path);
  }
  if (canReadOsRecentDocuments) {
    return;
  }

  const normalized = normalizePath(path);
  const items = loadLocalRecentItems().filter((item) => normalizePath(item.path) !== normalized);

  items.unshift({
    path: normalized,
    isDirectory,
    timestamp: Date.now()
  });

  saveLocalRecentItems(items.slice(0, MAX_RECENT_ITEMS));
};

export const removeRecentItem = (path: string): void => {
  if (canReadOsRecentDocuments) {
    const normalized = normalizePath(path);
    const remaining = app
      .getRecentDocuments()
      .filter((document) => normalizePath(document) !== normalized);
    app.clearRecentDocuments();
    remaining.forEach((document) => app.addRecentDocument(document));
    return;
  }

  const items = loadLocalRecentItems().filter((item) => item.path !== path);
  saveLocalRecentItems(items);
};

export const removeRecentItemsFromHistory = (paths: Set<string>): void => {
  if (canReadOsRecentDocuments) {
    return;
  }
  const items = loadLocalRecentItems().filter((item) => !paths.has(normalizePath(item.path)));
  saveLocalRecentItems(items);
};

export const clearRecentItems = (): void => {
  if (canReadOsRecentDocuments) {
    app.clearRecentDocuments();
    return;
  }
  saveLocalRecentItems([]);
};
