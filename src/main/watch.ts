import { BrowserWindow, WebContents } from 'electron';
import fs from 'node:fs';

interface WatcherEntry {
  watcher: fs.FSWatcher;
  timer: NodeJS.Timeout | null;
}

const watchers = new Map<number, WatcherEntry>();

const disposeWatcher = (id: number): void => {
  const entry = watchers.get(id);
  if (!entry) {
    return;
  }
  if (entry.timer) {
    clearTimeout(entry.timer);
  }
  try {
    entry.watcher.close();
  } catch {
    // ignore
  }
  watchers.delete(id);
};

export const unwatchDirectory = (webContents: WebContents): void => {
  disposeWatcher(webContents.id);
};

export const watchDirectory = (
  webContents: WebContents,
  path: string,
  recursive: boolean
): void => {
  disposeWatcher(webContents.id);

  const window = BrowserWindow.fromWebContents(webContents);
  if (!window) {
    return;
  }

  let watcher: fs.FSWatcher;
  try {
    watcher = fs.watch(path, { recursive }, () => {
      handleChange(webContents.id, path, window);
    });
  } catch {
    try {
      watcher = fs.watch(path, () => {
        handleChange(webContents.id, path, window);
      });
    } catch {
      return;
    }
  }

  watcher.on('error', () => {
    disposeWatcher(webContents.id);
  });

  watchers.set(webContents.id, { watcher, timer: null });
};

const handleChange = (id: number, path: string, window: BrowserWindow): void => {
  const entry = watchers.get(id);
  if (!entry) {
    return;
  }

  if (entry.timer) {
    clearTimeout(entry.timer);
  }

  entry.timer = setTimeout(() => {
    entry.timer = null;
    if (!window.isDestroyed()) {
      window.webContents.send('directory-changed', { path });
    }
  }, 200);
};

export const unwatchAllForWindow = (webContents: WebContents): void => {
  disposeWatcher(webContents.id);
};

export const unwatchById = (id: number): void => {
  disposeWatcher(id);
};
