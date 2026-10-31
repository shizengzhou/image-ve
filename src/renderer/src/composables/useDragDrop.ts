import { ref, type Ref } from 'vue';

import type { ImageItem } from '@shared/types';

export interface DragDropOptions {
  imageItems: Ref<ImageItem[]>;
  statusMessage: Ref<string>;
  openImageFile: (path?: string) => Promise<boolean>;
  openDirectory: (path?: string) => Promise<boolean>;
}

export const useDragDrop = (options: DragDropOptions) => {
  const lastDropKey = ref<string | null>(null);
  const lastDropAt = ref(0);

  const handleDroppedPaths = async (paths: string[]): Promise<void> => {
    if (!paths.length || options.imageItems.value.length > 0) {
      return;
    }

    const now = Date.now();
    const key = paths.join('|');
    if (lastDropKey.value === key && now - lastDropAt.value < 500) {
      return;
    }
    lastDropKey.value = key;
    lastDropAt.value = now;

    const targetPath = paths[0];
    if (!targetPath) {
      return;
    }

    try {
      const isDirectory = await window.electron.pathIsDirectory(targetPath);
      if (isDirectory) {
        await options.openDirectory(targetPath);
      } else {
        await options.openImageFile(targetPath);
      }
    } catch {
      options.statusMessage.value = '';
    }
  };

  const handleDragOver = (event: DragEvent): void => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (event: DragEvent): void => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    const paths = files
      .map((file) => window.electron.getPathForFile(file))
      .filter((path) => path.length > 0);
    void handleDroppedPaths(paths);
  };

  const register = (): (() => void) => {
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  };

  return {
    register
  };
};
