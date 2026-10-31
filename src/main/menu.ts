import { app, BrowserWindow, dialog, Menu, MenuItemConstructorOptions, shell } from 'electron';

import i18next from '@shared/i18n';
import type { IpcChannel } from '@shared/types';

const sendToFocusedWindow = (channel: IpcChannel, ...args: unknown[]): void => {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  if (!window || window.isDestroyed()) {
    return;
  }
  window.webContents.send(channel, ...args);
};

const openSettings = (): void => {
  sendToFocusedWindow('open-settings-window');
};

export const rebuildAppMenu = (): void => {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  const template: MenuItemConstructorOptions[] = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: i18next.t('settings.title'),
          accelerator: 'CmdOrCtrl+,',
          click: openSettings
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: i18next.t('menu.file'),
      submenu: [
        {
          label: i18next.t('empty.openFile'),
          accelerator: 'CmdOrCtrl+O',
          click: () => sendToFocusedWindow('menu-open-file')
        },
        {
          label: i18next.t('empty.openDirectory'),
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendToFocusedWindow('menu-open-directory')
        },
        {
          label: i18next.t('menu.openRecent'),
          role: 'recentDocuments'
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: i18next.t('menu.edit'),
      submenu: [
        {
          label: i18next.t('menu.search'),
          accelerator: 'CmdOrCtrl+F',
          click: () => sendToFocusedWindow('menu-search')
        },
        { type: 'separator' },
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: i18next.t('menu.view'),
      submenu: [
        {
          label: i18next.t('menu.toggle_thumbnails'),
          click: () => sendToFocusedWindow('menu-toggle-thumbnails')
        },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: i18next.t('menu.help'),
      submenu: [
        {
          label: i18next.t('menu.feedback'),
          click: () => {
            void shell.openExternal('https://github.com/shizengzhou/image-v-feedback/issues');
          }
        },
        { type: 'separator' },
        {
          label: i18next.t('menu.about'),
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: app.getName(),
              message: `${app.getName()}\n${i18next.t('common.version')}: ${app.getVersion()}`
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
