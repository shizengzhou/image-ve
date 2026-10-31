export type ImageItem = {
  path: string;
  name: string;
  mime: string | null;
  bitmap: ImageBitmap | null;
  src: string | null;
  thumbnailSrc: string | null;
  loadError: string | null;
  fitMode: 'actual' | 'window';
  zoom: number | null;
  rotation: number;
  flipX: boolean;
  width?: number;
  height?: number;
};

export type Settings = {
  recursiveSubdirectories: boolean;
  theme: string;
  language: string;
  autoplayIntervalMs: number;
  wheelZoomStep: number;
};

export type ThemePreference = 'light' | 'dark' | 'system';

export type LanguagePreference = 'zh-CN' | 'zh-TW' | 'de' | 'en' | 'fr' | 'it' | 'ja' | 'ko' | 'ru';

export type Language = {
  value: LanguagePreference;
  name: string;
};

export type SortKey = 'name' | 'extension' | 'modified' | 'created' | 'captured' | 'size';

export type SortOrder = 'asc' | 'desc';

export type ContextMenuPayload = {
  imagePath: string | null;
  filterOptions: string[];
  activeFilters: string[];
  sortKey: SortKey;
  sortOrder: SortOrder;
};

export type ContextMenuCommand =
  { type: 'sort'; key: SortKey; order: SortOrder } | { type: 'filter-toggle'; extension: string };

export type ImageSize = {
  width: number;
  height: number;
};

export type CacheStats = {
  bytes: number;
  count: number;
  path: string;
};

export type RecentItem = {
  path: string;
  isDirectory: boolean;
  timestamp: number;
  thumbnail?: string;
};

export type FileMetadata = {
  size: number;
  modified: number | null;
  created: number | null;
  colorSpace: string | null;
  colorProfile: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  deviceManufacturer: string | null;
  deviceModel: string | null;
  lensModel: string | null;
  capturedAt: string | null;
  focalLength: string | null;
  isoSpeed: string | null;
  flash: string | null;
  aperture: string | null;
  meteringMode: string | null;
  whiteBalance: string | null;
  exposureMode: string | null;
  exposureBias: string | null;
  exposureTime: string | null;
  exposureProgram: string | null;
  longitude: string | null;
  latitude: string | null;
  iptcDescription: string | null;
};

export type AppInfo = {
  name: string;
  bundleId: string;
  iconPath: string | null;
};

export type AppMetadata = {
  name: string;
  version: string;
};

export type OpenPathPayload = {
  path: string;
  isDirectory: boolean;
};

export type DirectoryChangedPayload = {
  path: string;
};

export type UnsubscribeFunction = () => void;

export type IpcChannel =
  | 'open-settings-window'
  | 'get-settings'
  | 'save-settings'
  | 'settings-changed'
  | 'get-locale'
  | 'set-theme'
  | 'show-open-file-dialog'
  | 'show-open-directory-dialog'
  | 'list-image-files'
  | 'path-is-directory'
  | 'decode-image-bytes'
  | 'decode-thumbnail-cached'
  | 'get-image-size'
  | 'read-file-metadata'
  | 'get-thumbnail-cache-stats'
  | 'clear-thumbnail-cache'
  | 'reveal-in-thumbnail-cache'
  | 'add-recent-document'
  | 'get-recent-items'
  | 'remove-recent-item'
  | 'clear-recent-items'
  | 'recent-items-changed'
  | 'watch-directory'
  | 'unwatch-directory'
  | 'directory-changed'
  | 'copy-file-to-clipboard'
  | 'copy-path-to-clipboard'
  | 'reveal-item-in-dir'
  | 'open-in-default-app'
  | 'open-with-app'
  | 'get-apps-for-file'
  | 'open-main-window'
  | 'app-metadata'
  | 'quit-app'
  | 'show-message-box'
  | 'open-external'
  | 'window-minimize'
  | 'window-toggle-maximize'
  | 'window-close'
  | 'window-is-maximized'
  | 'window-is-fullscreen'
  | 'window-maximized-changed'
  | 'window-fullscreen-changed'
  | 'menu-open-file'
  | 'menu-open-directory'
  | 'menu-toggle-thumbnails'
  | 'menu-search'
  | 'app-open-path'
  | 'set-menu-language'
  | 'show-context-menu'
  | 'context-menu-command';

export type ElectronApi = {
  platform: string;
  openSettingsWindow: () => void;
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => void;
  getLocale: () => Promise<string>;
  setTheme: (theme: ThemePreference) => void;
  onSettingsChanged: (callback: (settings: Settings) => void) => UnsubscribeFunction;

  showOpenFileDialog: () => Promise<string | null>;
  showOpenDirectoryDialog: () => Promise<string | null>;
  listImageFiles: (directory: string, recursive: boolean) => Promise<string[]>;
  pathIsDirectory: (path: string) => Promise<boolean>;
  decodeImageBytes: (path: string) => Promise<ArrayBuffer>;
  decodeThumbnail: (path: string, maxSize: number) => Promise<ArrayBuffer>;
  getImageSize: (path: string) => Promise<ImageSize>;
  readFileMetadata: (path: string) => Promise<FileMetadata>;

  getThumbnailCacheStats: () => Promise<CacheStats>;
  clearThumbnailCache: () => Promise<CacheStats>;
  revealInThumbnailCache: (path: string) => Promise<void>;

  addRecentDocument: (path: string, isDirectory: boolean) => void;
  getRecentItems: () => Promise<RecentItem[]>;
  removeRecentItem: (path: string) => Promise<void>;
  clearRecentItems: () => Promise<void>;
  onRecentItemsChanged: (callback: () => void) => UnsubscribeFunction;

  watchDirectory: (path: string, recursive: boolean) => Promise<void>;
  unwatchDirectory: () => Promise<void>;
  onDirectoryChanged: (callback: (payload: DirectoryChangedPayload) => void) => UnsubscribeFunction;

  copyFileToClipboard: (path: string) => Promise<void>;
  copyPathToClipboard: (path: string) => Promise<void>;
  revealItemInDir: (path: string) => Promise<void>;
  openInDefaultApp: (path: string) => Promise<void>;
  openWithApp: (path: string, bundleId: string) => Promise<void>;
  getAppsForFile: (path: string) => Promise<AppInfo[]>;
  showContextMenu: (payload: ContextMenuPayload) => void;
  onContextMenuCommand: (callback: (command: ContextMenuCommand) => void) => UnsubscribeFunction;

  openMainWindow: (path: string, isDirectory: boolean) => void;
  getAppMetadata: () => Promise<AppMetadata>;
  quitApp: () => void;
  showMessageBox: (message: string, title: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  setMenuLanguage: (language: LanguagePreference) => void;

  windowMinimize: () => void;
  windowToggleMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  windowIsFullscreen: () => Promise<boolean>;
  onWindowMaximizedChanged: (callback: (isMaximized: boolean) => void) => UnsubscribeFunction;
  onWindowFullscreenChanged: (callback: (isFullscreen: boolean) => void) => UnsubscribeFunction;

  onMenuOpenFile: (callback: () => void) => UnsubscribeFunction;
  onMenuOpenDirectory: (callback: () => void) => UnsubscribeFunction;
  onMenuToggleThumbnails: (callback: () => void) => UnsubscribeFunction;
  onMenuSearch: (callback: () => void) => UnsubscribeFunction;
  onAppOpenPath: (callback: (payload: OpenPathPayload) => void) => UnsubscribeFunction;

  getPathForFile: (file: File) => string;
};

declare global {
  interface Window {
    electron: ElectronApi;
  }
}
