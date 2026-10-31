import { dialog } from 'electron';
import fs from 'node:fs';
import { extname, join } from 'node:path';

import { SUPPORTED_EXTENSIONS } from '@shared/constants';

const supportedExtensions = new Set(SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`));

export const showOpenFileDialog = async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: SUPPORTED_EXTENSIONS }]
  });

  return result.filePaths[0] ?? null;
};

export const showOpenDirectoryDialog = async (): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  return result.filePaths[0] ?? null;
};

export const listImageFiles = async (
  directoryPath: string,
  recursive: boolean
): Promise<string[]> => {
  const results: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const entryPath = join(directory, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          await visit(entryPath);
        }
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!supportedExtensions.has(extname(entry.name).toLowerCase())) {
        continue;
      }

      results.push(entryPath);
    }
  };

  await visit(directoryPath);

  return results;
};
