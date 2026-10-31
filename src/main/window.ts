import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { join } from 'node:path';

import { is } from '@electron-toolkit/utils';

import icon from '../../resources/icon.png?asset';

interface LoadOptions {
  route: string;
  query?: Record<string, string>;
}

interface WindowOptions extends BrowserWindowConstructorOptions {
  routePath: string;
  query?: Record<string, string>;
}

const loadWindow = (window: BrowserWindow, options: LoadOptions): void => {
  const search = options.query ? new URLSearchParams(options.query).toString() : '';

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const url = `${process.env['ELECTRON_RENDERER_URL']}${search ? `?${search}` : ''}#${options.route}`;
    window.loadURL(url);
    return;
  }

  window.loadFile(join(__dirname, '../renderer/index.html'), {
    query: options.query ?? {},
    hash: options.route
  });
};

const getCommonWindowOptions = (): BrowserWindowConstructorOptions => {
  return {
    show: false,
    backgroundColor: '#20262d',
    ...(process.platform === 'linux' ? { icon } : {}),
    ...(process.platform === 'darwin'
      ? { titleBarStyle: 'hiddenInset' as const }
      : { frame: false }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js')
    }
  };
};

export const createWindow = (options: WindowOptions): BrowserWindow => {
  const browserWindow = new BrowserWindow({
    ...getCommonWindowOptions(),
    width: options.width,
    height: options.height,
    minWidth: options.minWidth,
    minHeight: options.minHeight,
    resizable: options.resizable === undefined ? true : options.resizable,
    title: options.title,
    autoHideMenuBar: true
  });

  browserWindow.on('ready-to-show', () => {
    browserWindow.show();
  });

  loadWindow(browserWindow, { route: options.routePath, query: options.query });

  return browserWindow;
};

export const createMainWindow = (openPath?: string, isDirectory = false): BrowserWindow => {
  const query = openPath ? { openPath, openIsDir: isDirectory ? 'true' : 'false' } : undefined;

  return createWindow({
    width: 1200,
    height: 700,
    minWidth: 640,
    minHeight: 420,
    routePath: '/',
    query
  });
};

export const createSettingsWindow = (): BrowserWindow => {
  return createWindow({
    width: 520,
    height: 470,
    routePath: '/settings',
    resizable: false
  });
};
