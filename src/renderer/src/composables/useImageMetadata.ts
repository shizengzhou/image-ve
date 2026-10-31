import { ref, type Ref } from 'vue';

import type { FileMetadata, ImageItem } from '@shared/types';
import { fileMetadataCache } from './useImageSort';

export const useImageMetadata = (currentImage: Ref<ImageItem | undefined>) => {
  const fileMetadata = ref<FileMetadata | null>(null);
  const isLoading = ref(false);
  let requestId = 0;

  const loadFileMetadata = async (): Promise<void> => {
    const path = currentImage.value?.path;
    if (!path) {
      fileMetadata.value = null;
      isLoading.value = false;
      return;
    }

    const cached = fileMetadataCache.get(path);
    if (cached) {
      fileMetadata.value = cached;
      isLoading.value = false;
      return;
    }

    const currentId = ++requestId;
    isLoading.value = true;

    try {
      const metadata = await window.electron.readFileMetadata(path);
      if (currentId === requestId) {
        fileMetadataCache.set(path, metadata);
        fileMetadata.value = metadata;
      }
    } catch {
      if (currentId === requestId) {
        fileMetadata.value = null;
      }
    } finally {
      if (currentId === requestId) {
        isLoading.value = false;
      }
    }
  };

  return {
    fileMetadata,
    isLoading,
    loadFileMetadata
  };
};
