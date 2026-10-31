import { contextBridge, ipcRenderer, IpcRendererEvent, webUtils } from 'electron';

import type {
  ContextMenuCommand,
  ElectronApi,
  IpcChannel,
  LanguagePreference,
  Settings
} from '@shared/types';

const ipcInvoke = <T>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
  return ipcRenderer.invoke(channel, ...args);
};

const ipcSend = (channel: IpcChannel, ...args: unknown[]): void => {
  ipcRenderer.send(channel, ...args);
};

const ipcOn = <Args extends unknown[]>(channel: IpcChannel, callback: (...args: Args) => void) => {
  const listener = (_event: IpcRendererEvent, ...args: Args): void => callback(...args);

  ipcRenderer.on(channel, listener);

  return () => ipcRenderer.off(channel, listener);
};

const api: ElectronApi = {
  platform: process.platform,
  openSettingsWindow: () => ipcSend('open-settings-window'),
  getSettings: () => ipcInvoke<Settings>('get-settings'),
  saveSettings: (settings) => ipcSend('save-settings', settings),
  getLocale: () => ipcInvoke<string>('get-locale'),
  setTheme: (theme) => ipcSend('set-theme', theme),
  onSettingsChanged: (callback) => ipcOn<[Settings]>('settings-changed', callback),

  showOpenFileDialog: () => ipcInvoke<string | null>('show-open-file-dialog'),
  showOpenDirectoryDialog: () => ipcInvoke<string | null>('show-open-directory-dialog'),
  listImageFiles: (directory, recursive) =>
    ipcInvoke<string[]>('list-image-files', directory, recursive),
  pathIsDirectory: (path) => ipcInvoke<boolean>('path-is-directory', path),
  decodeImageBytes: (path) => ipcInvoke<ArrayBuffer>('decode-image-bytes', path),
  decodeThumbnail: (path, maxSize) =>
    ipcInvoke<ArrayBuffer>('decode-thumbnail-cached', path, maxSize),
  getImageSize: (path) => ipcInvoke('get-image-size', path),
  readFileMetadata: (path) => ipcInvoke('read-file-metadata', path),

  getThumbnailCacheStats: () => ipcInvoke('get-thumbnail-cache-stats'),
  clearThumbnailCache: () => ipcInvoke('clear-thumbnail-cache'),
  revealInThumbnailCache: (path) => ipcInvoke('reveal-in-thumbnail-cache', path),

  addRecentDocument: (path, isDirectory) => ipcSend('add-recent-document', path, isDirectory),
  getRecentItems: () => ipcInvoke('get-recent-items'),
  removeRecentItem: (path) => ipcInvoke('remove-recent-item', path),
  clearRecentItems: () => ipcInvoke('clear-recent-items'),
  onRecentItemsChanged: (callback) => ipcOn('recent-items-changed', callback),

  watchDirectory: (path, recursive) => ipcInvoke('watch-directory', path, recursive),
  unwatchDirectory: () => ipcInvoke('unwatch-directory'),
  onDirectoryChanged: (callback) => ipcOn('directory-changed', callback),

  copyFileToClipboard: (path) => ipcInvoke('copy-file-to-clipboard', path),
  copyPathToClipboard: (path) => ipcInvoke('copy-path-to-clipboard', path),
  revealItemInDir: (path) => ipcInvoke('reveal-item-in-dir', path),
  openInDefaultApp: (path) => ipcInvoke('open-in-default-app', path),
  openWithApp: (path, bundleId) => ipcInvoke('open-with-app', path, bundleId),
  getAppsForFile: (path) => ipcInvoke('get-apps-for-file', path),
  showContextMenu: (payload) => ipcSend('show-context-menu', payload),
  onContextMenuCommand: (callback) => ipcOn<[ContextMenuCommand]>('context-menu-command', callback),

  openMainWindow: (path, isDirectory) => ipcSend('open-main-window', path, isDirectory),
  getAppMetadata: () => ipcInvoke('app-metadata'),
  quitApp: () => ipcSend('quit-app'),
  showMessageBox: (message, title) => ipcInvoke('show-message-box', message, title),
  openExternal: (url) => ipcInvoke('open-external', url),
  setMenuLanguage: (language: LanguagePreference) => ipcSend('set-menu-language', language),

  windowMinimize: () => ipcSend('window-minimize'),
  windowToggleMaximize: () => ipcSend('window-toggle-maximize'),
  windowClose: () => ipcSend('window-close'),
  windowIsMaximized: () => ipcInvoke<boolean>('window-is-maximized'),
  windowIsFullscreen: () => ipcInvoke<boolean>('window-is-fullscreen'),
  onWindowMaximizedChanged: (callback) => ipcOn<[boolean]>('window-maximized-changed', callback),
  onWindowFullscreenChanged: (callback) => ipcOn<[boolean]>('window-fullscreen-changed', callback),

  onMenuOpenFile: (callback) => ipcOn('menu-open-file', callback),
  onMenuOpenDirectory: (callback) => ipcOn('menu-open-directory', callback),
  onMenuToggleThumbnails: (callback) => ipcOn('menu-toggle-thumbnails', callback),
  onMenuSearch: (callback) => ipcOn('menu-search', callback),
  onAppOpenPath: (callback) => ipcOn('app-open-path', callback),

  getPathForFile: (file) => webUtils.getPathForFile(file)
};

contextBridge.exposeInMainWorld('electron', api);
