import { ipcMain, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron';

import { IpcChannel } from '@shared/types';

import { log } from './logger';

const SLOW_IPC_MS = 300;

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
  ipcMain.handle(channel, async (event, ...args) => {
    const startedAt = Date.now();
    try {
      return await listener(event, ...(args as Args));
    } catch (error) {
      log('error', `ipc ${channel} failed`, error);
      throw error;
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= SLOW_IPC_MS) {
        log('warn', `ipc ${channel} took ${elapsed}ms`);
      }
    }
  });
};

export const ipcWebcontentsSend = <Args extends unknown[]>(
  webContents: WebContents,
  channel: IpcChannel,
  ...args: Args
): void => {
  webContents.send(channel, ...args);
};
