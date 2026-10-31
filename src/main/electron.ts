import { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';

import { IpcChannel } from '@shared/types';

export const ipcMainOn = <Args extends unknown[]>(
  channel: IpcChannel,
  listener: (event: IpcMainEvent, ...args: Args) => void
): void => {
  ipcMain.on(channel, listener);
};

export const ipcMainHandle = <Args extends unknown[], ReturnType>(
  channel: IpcChannel,
  listener: (event: IpcMainInvokeEvent, ...args: Args) => ReturnType
): void => {
  ipcMain.handle(channel, listener);
};

export const ipcWebcontentsSend = <Args extends unknown[]>(
  webContents: WebContents,
  channel: IpcChannel,
  ...args: Args
): void => {
  webContents.send(channel, ...args);
};
