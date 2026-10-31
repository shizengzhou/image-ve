import {
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron';

import i18next from '@shared/i18n';
import type { ContextMenuCommand, ContextMenuPayload, SortKey } from '@shared/types';

import {
  copyFileToClipboard,
  copyPathToClipboard,
  getAppsForFile,
  openInDefaultApp,
  openWithApp,
  revealItemInDir
} from './fileOps';

const sortItems: Array<{ key: SortKey; labelKey: string }> = [
  { key: 'name', labelKey: 'viewer.sortByName' },
  { key: 'modified', labelKey: 'viewer.sortByModified' },
  { key: 'created', labelKey: 'viewer.sortByCreated' },
  { key: 'captured', labelKey: 'viewer.sortByCaptured' },
  { key: 'size', labelKey: 'viewer.sortBySize' }
];

const run = (task: Promise<void>): void => {
  void task.catch((error) => console.error('context menu action failed', error));
};

export const showContextMenu = async (
  window: BrowserWindow,
  payload: ContextMenuPayload,
  sender: WebContents
): Promise<void> => {
  const imagePath = payload.imagePath;
  if (!imagePath) {
    return;
  }

  const send = (command: ContextMenuCommand): void => {
    if (!sender.isDestroyed()) {
      sender.send('context-menu-command', command);
    }
  };

  const activeFilters = new Set(payload.activeFilters.map((extension) => extension.toLowerCase()));

  const template: MenuItemConstructorOptions[] = [
    {
      label: i18next.t('viewer.copyFile'),
      click: () => run(copyFileToClipboard(imagePath))
    },
    {
      label: i18next.t('viewer.copyPath'),
      click: () => run(copyPathToClipboard(imagePath))
    },
    { type: 'separator' },
    {
      label: i18next.t('viewer.sort'),
      submenu: [
        ...sortItems.map<MenuItemConstructorOptions>((item) => ({
          label: i18next.t(item.labelKey),
          type: 'radio',
          checked: payload.sortKey === item.key,
          click: () => send({ type: 'sort', key: item.key, order: payload.sortOrder })
        })),
        { type: 'separator' },
        {
          label: i18next.t('viewer.sortAsc'),
          type: 'radio',
          checked: payload.sortOrder === 'asc',
          click: () => send({ type: 'sort', key: payload.sortKey, order: 'asc' })
        },
        {
          label: i18next.t('viewer.sortDesc'),
          type: 'radio',
          checked: payload.sortOrder === 'desc',
          click: () => send({ type: 'sort', key: payload.sortKey, order: 'desc' })
        }
      ]
    },
    {
      label: i18next.t('viewer.filter'),
      enabled: payload.filterOptions.length > 0,
      submenu: payload.filterOptions.map<MenuItemConstructorOptions>((extension) => ({
        label: extension.toUpperCase(),
        type: 'checkbox',
        checked: activeFilters.has(extension.toLowerCase()),
        click: () => send({ type: 'filter-toggle', extension })
      }))
    },
    { type: 'separator' },
    {
      label: i18next.t('viewer.reveal', {
        app:
          process.platform === 'darwin'
            ? i18next.t('common.finder')
            : process.platform === 'linux'
              ? i18next.t('common.fileManager')
              : i18next.t('common.explorer')
      }),
      click: () => run(revealItemInDir(imagePath))
    },
    {
      label: i18next.t('viewer.openDefault'),
      click: () => run(openInDefaultApp(imagePath))
    }
  ];

  if (process.platform === 'darwin') {
    const apps = await getAppsForFile();
    if (apps.length > 0) {
      template.push({
        label: i18next.t('viewer.openWith'),
        submenu: apps.map<MenuItemConstructorOptions>((entry) => ({
          label: entry.name,
          click: () => run(openWithApp(imagePath, entry.bundleId))
        }))
      });
    }
  }

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window });
};
