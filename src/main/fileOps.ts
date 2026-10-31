import { clipboard, shell } from 'electron';
import { execFile } from 'node:child_process';

import type { AppInfo } from '@shared/types';

const runCommand = (command: string, args: string[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const quotePowerShell = (value: string): string => `'${value.replace(/'/g, "''")}'`;

export const copyFileToClipboard = async (path: string): Promise<void> => {
  if (process.platform === 'win32') {
    const script =
      'Add-Type -AssemblyName System.Windows.Forms; ' +
      '$col=New-Object System.Collections.Specialized.StringCollection; ' +
      `[void]$col.Add(${quotePowerShell(path)}); ` +
      '[System.Windows.Forms.Clipboard]::SetFileDropList($col)';
    await runCommand('powershell', ['-NoProfile', '-NonInteractive', '-STA', '-Command', script]);
    return;
  }

  if (process.platform === 'darwin') {
    await runCommand('osascript', [
      '-e',
      'on run argv',
      '-e',
      'set the clipboard to POSIX file (item 1 of argv)',
      '-e',
      'end run',
      path
    ]);
    return;
  }

  clipboard.writeText(path);
};

export const copyPathToClipboard = async (path: string): Promise<void> => {
  clipboard.writeText(path);
};

export const revealItemInDir = async (path: string): Promise<void> => {
  shell.showItemInFolder(path);
};

export const openInDefaultApp = async (path: string): Promise<void> => {
  if (process.platform === 'darwin') {
    await runCommand('open', [path]);
    return;
  }
  await shell.openPath(path);
};

export const openWithApp = async (path: string, bundleId: string): Promise<void> => {
  if (process.platform !== 'darwin') {
    throw new Error('Current platform does not support this feature');
  }
  await runCommand('open', ['-b', bundleId, path]);
};

export const getAppsForFile = async (): Promise<AppInfo[]> => [];
