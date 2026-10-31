import { app, BrowserWindow, dialog, shell } from 'electron';
import fs from 'node:fs';
import { extname, isAbsolute } from 'node:path';

import { electronApp, optimizer } from '@electron-toolkit/utils';
import { SUPPORTED_EXTENSIONS } from '@shared/constants';
import { getLanguage, initI18n } from '@shared/i18n';
import type {
  ContextMenuPayload,
  LanguagePreference,
  OpenPathPayload,
  Settings,
  ThemePreference
} from '@shared/types';

import { showContextMenu } from './contextMenu';

import { ipcMainHandle, ipcMainOn } from './electron';
import { stopExiftool } from './exiftool';
import {
  copyFileToClipboard,
  copyPathToClipboard,
  getAppsForFile,
  openInDefaultApp,
  openWithApp,
  revealItemInDir
} from './fileOps';
import { decodeImageBytes, getImageSize } from './image';
import { readFileMetadata } from './metadata';
import { rebuildAppMenu } from './menu';
import { listImageFiles, showOpenDirectoryDialog, showOpenFileDialog } from './open';
import { addRecentItem, clearRecentItems, getRecentItems, removeRecentItem } from './recentItems';
import { updateWindowsJumpList } from './jumpList';
import { getSettings, saveSettings } from './settings';
import { setTheme } from './theme';
import {
  clearThumbnailCache,
  getThumbnail,
  getThumbnailCacheStats,
  revealInThumbnailCache
} from './thumbnail';
import { unwatchById, unwatchDirectory, watchDirectory } from './watch';
import { createMainWindow, createSettingsWindow } from './window';

const supportedExtensions = new Set(SUPPORTED_EXTENSIONS);

let settingsWindow: BrowserWindow | undefined;
let pendingOpenPath: OpenPathPayload | null = null;

const isSettingsWindow = (window: BrowserWindow): boolean => window === settingsWindow;

const getMainWindows = (): BrowserWindow[] =>
  BrowserWindow.getAllWindows().filter(
    (window) => !window.isDestroyed() && !isSettingsWindow(window)
  );

const pathToPayload = (path: string): OpenPathPayload | null => {
  try {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
      return { path, isDirectory: true };
    }
    if (stat.isFile() && supportedExtensions.has(extname(path).slice(1).toLowerCase())) {
      return { path, isDirectory: false };
    }
  } catch {
    return null;
  }
  return null;
};

const extractOpenPath = (args: string[]): OpenPathPayload | null => {
  const appPath = app.getAppPath();

  for (const arg of args) {
    if (!arg || arg.startsWith('-') || !isAbsolute(arg) || arg === appPath) {
      continue;
    }
    const payload = pathToPayload(arg);
    if (payload) {
      return payload;
    }
  }

  return null;
};

const setupWindow = (window: BrowserWindow): void => {
  const webContentsId = window.webContents.id;

  const send = (channel: string, value: boolean): void => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, value);
    }
  };

  window.on('maximize', () => send('window-maximized-changed', true));
  window.on('unmaximize', () => send('window-maximized-changed', false));
  window.on('enter-full-screen', () => send('window-fullscreen-changed', true));
  window.on('leave-full-screen', () => send('window-fullscreen-changed', false));
  window.on('closed', () => {
    unwatchById(webContentsId);
  });
};

const openMainWindow = (path?: string, isDirectory = false): BrowserWindow => {
  const window = createMainWindow(path, isDirectory);
  setupWindow(window);
  return window;
};

const openSettingsWindow = (): void => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    if (settingsWindow.isMinimized()) {
      settingsWindow.restore();
    }
    settingsWindow.focus();
    return;
  }

  settingsWindow = createSettingsWindow();
  setupWindow(settingsWindow);
  settingsWindow.on('closed', () => {
    settingsWindow = undefined;
  });
};

const notifyRecentItemsChanged = (): void => {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send('recent-items-changed');
    }
  });
  rebuildAppMenu();
  void getRecentItems().then((items) => updateWindowsJumpList(items));
};

const openPathInExistingWindow = (payload: OpenPathPayload): void => {
  const existing = getMainWindows()[0];

  if (!existing) {
    openMainWindow(payload.path, payload.isDirectory);
    return;
  }

  if (existing.isMinimized()) {
    existing.restore();
  }
  existing.show();
  existing.focus();
  existing.webContents.send('app-open-path', payload);
};

const registerIpcHandlers = (): void => {
  ipcMainOn('open-settings-window', () => openSettingsWindow());
  ipcMainHandle('get-settings', () => getSettings());
  ipcMainOn('save-settings', (_event, settings: Settings) => {
    void saveSettings(settings);
  });
  ipcMainHandle('get-locale', () => app.getLocale());
  ipcMainOn('set-theme', (_event, theme: ThemePreference) => setTheme(theme));

  ipcMainHandle('show-open-file-dialog', () => showOpenFileDialog());
  ipcMainHandle('show-open-directory-dialog', () => showOpenDirectoryDialog());
  ipcMainHandle('list-image-files', (_event, directory: string, recursive: boolean) =>
    listImageFiles(directory, recursive)
  );
  ipcMainHandle('path-is-directory', async (_event, path: string) => {
    try {
      const stat = await fs.promises.stat(path);
      return stat.isDirectory();
    } catch {
      return false;
    }
  });

  ipcMainHandle('decode-image-bytes', (_event, path: string) => decodeImageBytes(path));
  ipcMainHandle('decode-thumbnail-cached', (_event, path: string, maxSize: number) =>
    getThumbnail(path, maxSize)
  );
  ipcMainHandle('get-image-size', (_event, path: string) => getImageSize(path));
  ipcMainHandle('read-file-metadata', (_event, path: string) => readFileMetadata(path));

  ipcMainHandle('get-thumbnail-cache-stats', () => getThumbnailCacheStats());
  ipcMainHandle('clear-thumbnail-cache', () => clearThumbnailCache());
  ipcMainHandle('reveal-in-thumbnail-cache', (_event, path: string) =>
    revealInThumbnailCache(path)
  );

  ipcMainOn('add-recent-document', (_event, path: string, isDirectory: boolean) => {
    addRecentItem(path, isDirectory);
    notifyRecentItemsChanged();
  });
  ipcMainHandle('get-recent-items', () => getRecentItems());
  ipcMainHandle('remove-recent-item', (_event, path: string) => {
    removeRecentItem(path);
    notifyRecentItemsChanged();
  });
  ipcMainHandle('clear-recent-items', () => {
    clearRecentItems();
    notifyRecentItemsChanged();
  });

  ipcMainHandle('watch-directory', (event, path: string, recursive: boolean) => {
    watchDirectory(event.sender, path, recursive);
  });
  ipcMainHandle('unwatch-directory', (event) => {
    unwatchDirectory(event.sender);
  });

  ipcMainHandle('copy-file-to-clipboard', (_event, path: string) => copyFileToClipboard(path));
  ipcMainHandle('copy-path-to-clipboard', (_event, path: string) => copyPathToClipboard(path));
  ipcMainHandle('reveal-item-in-dir', (_event, path: string) => revealItemInDir(path));
  ipcMainHandle('open-in-default-app', (_event, path: string) => openInDefaultApp(path));
  ipcMainHandle('open-with-app', (_event, path: string, bundleId: string) =>
    openWithApp(path, bundleId)
  );
  ipcMainHandle('get-apps-for-file', () => getAppsForFile());
  ipcMainOn('show-context-menu', (event, payload: ContextMenuPayload) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }
    void showContextMenu(window, payload, event.sender).catch((error) =>
      console.error('show context menu failed', error)
    );
  });

  ipcMainOn('open-main-window', (_event, path: string, isDirectory: boolean) => {
    openMainWindow(path, isDirectory);
  });
  ipcMainHandle('app-metadata', () => ({
    name: app.getName(),
    version: app.getVersion()
  }));
  ipcMainOn('quit-app', () => app.quit());
  ipcMainHandle('show-message-box', async (_event, message: string, title: string) => {
    await dialog.showMessageBox({ type: 'info', title, message, buttons: ['OK'] });
  });
  ipcMainHandle('open-external', (_event, url: string) => shell.openExternal(url));
  ipcMainOn('set-menu-language', (_event, language: LanguagePreference) => {
    void initI18n(language);
    rebuildAppMenu();
  });

  ipcMainOn('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMainOn('window-toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return;
    }
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });
  ipcMainOn('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
  ipcMainHandle('window-is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false;
  });
  ipcMainHandle('window-is-fullscreen', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false;
  });
};

const init = async (): Promise<void> => {
  electronApp.setAppUserModelId('com.shizeng.ImageVE');

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on('before-quit', () => {
    void stopExiftool();
  });

  const settings = await getSettings();
  setTheme(settings.theme as ThemePreference);
  await initI18n(settings.language || getLanguage(app.getLocale()));
  rebuildAppMenu();
  void getRecentItems().then((items) => updateWindowsJumpList(items));
};

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const payload = extractOpenPath(argv);
    if (payload) {
      openPathInExistingWindow(payload);
      return;
    }
    const existing = getMainWindows()[0];
    if (existing) {
      if (existing.isMinimized()) {
        existing.restore();
      }
      existing.show();
      existing.focus();
    }
  });

  app.on('open-file', (event, path) => {
    event.preventDefault();
    const payload = pathToPayload(path);
    if (!payload) {
      return;
    }
    if (app.isReady()) {
      openPathInExistingWindow(payload);
    } else {
      pendingOpenPath = payload;
    }
  });

  app.whenReady().then(async () => {
    await init();
    registerIpcHandlers();

    const initialPath = pendingOpenPath ?? extractOpenPath(process.argv);
    pendingOpenPath = null;
    openMainWindow(initialPath?.path, initialPath?.isDirectory ?? false);

    app.on('activate', () => {
      if (getMainWindows().length === 0) {
        openMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
