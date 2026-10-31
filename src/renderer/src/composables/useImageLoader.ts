import { computed, ref, type Ref } from 'vue';

import i18next from '@shared/i18n';
import type { ImageItem, SortKey, SortOrder } from '@shared/types';
import { getExtension } from '../utils/formatter';
import { isPermissionDenied } from '../utils/error';
import { dirname, normalizePath } from '../utils/path';
import { revokeObjectUrl } from '../utils/url';
import { useImageSort } from './useImageSort';
import { useRecursivePreference } from './useRecursivePreference';
import { useThumbnailLoader } from './useThumbnailLoader';

export const useImageLoader = (imageItems: Ref<ImageItem[]>, currentIndex: Ref<number>) => {
  const isLoading = ref(false);
  const statusMessage = ref('');
  const { recursiveSubdirectories, ensureSettingsLoaded } = useRecursivePreference();
  const currentDirectory = ref<string | null>(null);
  const lastLoadError = ref<string | null>(null);
  const isSoftRefreshing = ref(false);
  const allItems = ref<ImageItem[]>([]);
  const extensionFilters = ref<string[]>([]);
  const sortKey = ref<SortKey>('name');
  const sortOrder = ref<SortOrder>('asc');
  const imageIndexMap = new Map<string, number>();

  const availableExtensions = computed(() => {
    const set = new Set<string>();
    for (const item of allItems.value) {
      const ext = getExtension(item.path);
      if (ext) {
        set.add(ext);
      }
    }
    return Array.from(set).sort();
  });

  const buildFilteredItems = (items: ImageItem[]): ImageItem[] => {
    if (extensionFilters.value.length === 0) {
      return items;
    }
    const allowed = new Set(extensionFilters.value.map((value) => value.toLowerCase()));
    return items.filter((item) => allowed.has(getExtension(item.path)));
  };

  const syncExtensionFilters = (): void => {
    const available = availableExtensions.value;
    if (available.length === 0) {
      extensionFilters.value = [];
      return;
    }
    if (extensionFilters.value.length === 0) {
      extensionFilters.value = available;
      return;
    }
    const availableSet = new Set(available);
    const next = extensionFilters.value.filter((value) => availableSet.has(value));
    if (next.length === 0) {
      extensionFilters.value = available;
    } else if (next.length !== extensionFilters.value.length) {
      extensionFilters.value = next;
    }
    const currentSet = new Set(extensionFilters.value);
    const hasNewExtensions = available.some((ext) => !currentSet.has(ext));
    if (hasNewExtensions) {
      extensionFilters.value = available;
    }
  };

  const rebuildIndexMap = (items: ImageItem[]): void => {
    imageIndexMap.clear();
    for (const [index, item] of items.entries()) {
      imageIndexMap.set(item.path, index);
    }
  };

  const getItemByPath = (path: string): ImageItem | null => {
    const index = imageIndexMap.get(path);
    return index === undefined ? null : (imageItems.value[index] ?? null);
  };

  const { sortItems, clearFileMetadataCache, deleteFileMetadata } = useImageSort(
    sortKey,
    sortOrder
  );

  const { loadThumbnail, setThumbnailVisibleRange, clearThumbnailCache, removeThumbnailFromCache } =
    useThumbnailLoader(imageItems, statusMessage, getItemByPath);

  const applyFilter = async (
    options: { preferredPath?: string; currentPath?: string } = {}
  ): Promise<void> => {
    const filtered = buildFilteredItems(allItems.value);
    const sorted = await sortItems(filtered);
    const filteredSet = new Set(filtered.map((item) => item.path));

    for (const item of allItems.value) {
      if (!filteredSet.has(item.path)) {
        if (item.bitmap) {
          item.bitmap.close();
          item.bitmap = null;
        }
        if (item.src) {
          revokeObjectUrl(item.src);
          item.src = null;
        }
        item.loadError = null;
      }
    }

    const shouldRestoreSoftRefreshing = !isSoftRefreshing.value;
    if (shouldRestoreSoftRefreshing) {
      isSoftRefreshing.value = true;
    }

    imageItems.value = sorted;
    rebuildIndexMap(sorted);

    if (shouldRestoreSoftRefreshing) {
      queueMicrotask(() => {
        isSoftRefreshing.value = false;
      });
    }

    if (sorted.length === 0) {
      currentIndex.value = 0;
      if (!lastLoadError.value) {
        statusMessage.value = i18next.t('status.noImages');
      }
      return;
    }

    if (options.preferredPath) {
      const preferred = normalizePath(options.preferredPath);
      const preferredIndex = sorted.findIndex((item) => normalizePath(item.path) === preferred);
      if (preferredIndex >= 0) {
        currentIndex.value = preferredIndex;
        statusMessage.value = '';
        return;
      }
    }

    if (options.currentPath) {
      const current = normalizePath(options.currentPath);
      const currentFilteredIndex = sorted.findIndex((item) => normalizePath(item.path) === current);
      if (currentFilteredIndex >= 0) {
        currentIndex.value = currentFilteredIndex;
        statusMessage.value = '';
        return;
      }
    }

    currentIndex.value = 0;
    statusMessage.value = '';
  };

  const setExtensionFilters = async (filters: string[]): Promise<void> => {
    extensionFilters.value = filters;
    const currentPath = imageItems.value[currentIndex.value]?.path;
    await applyFilter({ currentPath });
  };

  const setSort = async (nextKey: SortKey, nextOrder: SortOrder): Promise<void> => {
    sortKey.value = nextKey;
    sortOrder.value = nextOrder;
    const currentPath = imageItems.value[currentIndex.value]?.path;
    await applyFilter({ currentPath });
  };

  const pickImageFile = async (): Promise<string | null> => {
    return window.electron.showOpenFileDialog();
  };

  const pickDirectory = async (): Promise<string | null> => {
    return window.electron.showOpenDirectoryDialog();
  };

  const loadFromDirectory = async (
    directory: string,
    preferredPath?: string,
    options: { refresh?: boolean } = {}
  ): Promise<boolean> => {
    const { refresh = false } = options;

    if (!refresh) {
      isLoading.value = true;
    }

    const previousCurrentPath = imageItems.value[currentIndex.value]?.path;
    statusMessage.value = '';
    lastLoadError.value = null;

    try {
      await ensureSettingsLoaded();
      currentDirectory.value = directory;

      const entries = await window.electron.listImageFiles(
        directory,
        recursiveSubdirectories.value
      );

      const previousItems = imageItems.value;
      const previousMap = new Map(previousItems.map((item) => [item.path, item]));
      const nextPaths = new Set(entries);

      if (!refresh) {
        previousItems.forEach((item) => {
          item.bitmap?.close();
          if (item.src) {
            revokeObjectUrl(item.src);
          }
        });
        clearThumbnailCache();
        clearFileMetadataCache();
      } else {
        for (const item of previousItems) {
          if (nextPaths.has(item.path)) {
            continue;
          }
          item.bitmap?.close();
          if (item.src) {
            revokeObjectUrl(item.src);
          }
          removeThumbnailFromCache(item.path);
          deleteFileMetadata(item.path);
        }
      }

      const nextItems: ImageItem[] = [];
      for (const entry of entries) {
        const existing = previousMap.get(entry);
        nextItems.push({
          path: entry,
          name: entry.split(/[\\/]/).pop() ?? entry,
          bitmap: existing?.bitmap ?? null,
          mime: existing?.mime ?? null,
          src: existing?.src ?? null,
          thumbnailSrc: existing?.thumbnailSrc ?? null,
          loadError: existing?.loadError ?? null,
          fitMode: existing?.fitMode ?? 'actual',
          zoom: existing?.zoom ?? null,
          rotation: existing?.rotation ?? 0,
          flipX: existing?.flipX ?? false
        });
      }

      if (refresh) {
        isSoftRefreshing.value = true;
      }

      allItems.value = nextItems;
      syncExtensionFilters();

      if (refresh) {
        queueMicrotask(() => {
          isSoftRefreshing.value = false;
        });
      }

      await applyFilter({ preferredPath, currentPath: previousCurrentPath });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      lastLoadError.value = detail;
      statusMessage.value = i18next.t('status.loadFailed', { detail });
    } finally {
      if (!refresh) {
        isLoading.value = false;
      }
    }

    return !lastLoadError.value;
  };

  const resetItems = (): void => {
    const previousItems = imageItems.value;
    previousItems.forEach((item) => {
      item.bitmap?.close();
      if (item.src) {
        revokeObjectUrl(item.src);
      }
    });
    clearThumbnailCache();
    clearFileMetadataCache();
    allItems.value = [];
  };

  const loadSingleImage = async (path: string): Promise<boolean> => {
    isLoading.value = true;
    statusMessage.value = '';
    lastLoadError.value = null;

    try {
      await ensureSettingsLoaded();
      currentDirectory.value = null;
      resetItems();

      const nextItems: ImageItem[] = [
        {
          path,
          name: path.split(/[\\/]/).pop() ?? path,
          mime: null,
          bitmap: null,
          src: null,
          thumbnailSrc: null,
          loadError: null,
          fitMode: 'actual',
          zoom: null,
          rotation: 0,
          flipX: false
        }
      ];

      allItems.value = nextItems;
      syncExtensionFilters();
      await applyFilter({ preferredPath: path });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      lastLoadError.value = detail;
      statusMessage.value = i18next.t('status.loadFailed', { detail });
    } finally {
      isLoading.value = false;
    }

    return !lastLoadError.value;
  };

  const openImageFile = async (path?: string): Promise<boolean> => {
    const selected = path ?? (await pickImageFile());
    if (!selected) {
      return false;
    }

    const directory = dirname(selected);
    const success = await loadFromDirectory(directory, selected);

    if (!success && isPermissionDenied(lastLoadError.value)) {
      const fallback = await loadSingleImage(selected);
      if (fallback) {
        window.electron.addRecentDocument(selected, false);
      }
      return fallback;
    }

    if (success) {
      window.electron.addRecentDocument(selected, false);
    }

    return success;
  };

  const openDirectory = async (path?: string): Promise<boolean> => {
    const selected = path ?? (await pickDirectory());
    if (!selected) {
      return false;
    }

    const success = await loadFromDirectory(selected);

    if (success) {
      window.electron.addRecentDocument(selected, true);
    }

    return success;
  };

  return {
    isLoading,
    statusMessage,
    currentDirectory,
    lastLoadError,
    isSoftRefreshing,
    extensionFilters,
    sortKey,
    sortOrder,
    availableExtensions,
    setExtensionFilters,
    setSort,
    pickImageFile,
    pickDirectory,
    openImageFile,
    openDirectory,
    loadThumbnail,
    setThumbnailVisibleRange,
    loadFromDirectory
  };
};
