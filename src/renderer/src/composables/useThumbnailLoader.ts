import { watch, type Ref } from 'vue';

import i18next from '@shared/i18n';
import type { ImageItem } from '@shared/types';
import { getMime } from '../utils/mime';

export const useThumbnailLoader = (
  imageItems: Ref<ImageItem[]>,
  statusMessage: Ref<string>,
  getItemByPath: (path: string) => ImageItem | null
) => {
  const loadingThumbnails = new Set<string>();
  const pendingThumbnails: Array<{ path: string; maxSize: number }> = [];
  const pendingThumbnailMap = new Map<string, { path: string; maxSize: number }>();
  let activeThumbnailJobs = 0;
  const maxThumbnailConcurrency = 3;
  let currentVisibleRange = { start: 0, end: -1 };
  const visiblePaths = new Set<string>();

  // Sorting / filtering / directory refresh replaces the items array while the
  // scroller keeps the same visible index range, so rebuild the path guard here
  // instead of relying on a range change.
  watch(imageItems, () => {
    if (currentVisibleRange.end < currentVisibleRange.start) {
      return;
    }
    const end = Math.min(currentVisibleRange.end, imageItems.value.length - 1);
    visiblePaths.clear();
    for (let index = currentVisibleRange.start; index <= end; index += 1) {
      const item = imageItems.value[index];
      if (item) {
        visiblePaths.add(item.path);
      }
    }
  });

  const releaseThumbnail = (item: ImageItem): void => {
    if (item.thumbnailSrc) {
      URL.revokeObjectURL(item.thumbnailSrc);
      item.thumbnailSrc = null;
    }
  };

  const cancelPendingThumbnail = (path: string): void => {
    if (pendingThumbnailMap.has(path)) {
      pendingThumbnailMap.delete(path);
      for (let i = pendingThumbnails.length - 1; i >= 0; i--) {
        if (pendingThumbnails[i]?.path === path) {
          pendingThumbnails.splice(i, 1);
          break;
        }
      }
    }
  };

  const runThumbnailQueue = (): void => {
    while (activeThumbnailJobs < maxThumbnailConcurrency && pendingThumbnails.length > 0) {
      const next = pendingThumbnails.shift();
      if (!next) {
        return;
      }
      pendingThumbnailMap.delete(next.path);
      if (loadingThumbnails.has(next.path)) {
        continue;
      }

      activeThumbnailJobs += 1;
      loadingThumbnails.add(next.path);

      void (async () => {
        try {
          const bytes = await window.electron.decodeThumbnail(next.path, next.maxSize);
          const mime = await getMime(bytes);
          const src = URL.createObjectURL(new Blob([bytes], { type: mime }));
          const current = getItemByPath(next.path);
          // A request can finish after the user scrolled away. Discard it so
          // off-screen blob URLs do not accumulate while scrolling quickly.
          const hasVisibleRange = currentVisibleRange.end >= currentVisibleRange.start;
          const isVisible = !hasVisibleRange || visiblePaths.has(next.path);
          if (current && !current.thumbnailSrc && isVisible) {
            current.thumbnailSrc = src;
          } else {
            URL.revokeObjectURL(src);
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          statusMessage.value = i18next.t('status.thumbnailFailed', { detail });
        } finally {
          loadingThumbnails.delete(next.path);
          activeThumbnailJobs = Math.max(0, activeThumbnailJobs - 1);
          runThumbnailQueue();
        }
      })();
    }
  };

  const loadThumbnail = (index: number, maxSize = 100): void => {
    const target = imageItems.value[index];
    if (!target) {
      return;
    }
    if (target.thumbnailSrc) {
      return;
    }
    if (loadingThumbnails.has(target.path)) {
      return;
    }

    const existing = pendingThumbnailMap.get(target.path);
    if (existing) {
      if (maxSize > existing.maxSize) {
        existing.maxSize = maxSize;
      }
      return;
    }

    const next = { path: target.path, maxSize };
    pendingThumbnailMap.set(target.path, next);
    pendingThumbnails.push(next);
    runThumbnailQueue();
  };

  const setThumbnailVisibleRange = (startIndex: number, endIndex: number): void => {
    const safeStart = Math.max(0, startIndex);
    const safeEnd = Math.min(imageItems.value.length - 1, endIndex);
    const prevStart = currentVisibleRange.start;
    const prevEnd = currentVisibleRange.end;
    currentVisibleRange = { start: safeStart, end: safeEnd };

    visiblePaths.clear();
    for (let index = safeStart; index <= safeEnd; index += 1) {
      const item = imageItems.value[index];
      if (item) {
        visiblePaths.add(item.path);
      }
    }

    if (prevStart > prevEnd) {
      return;
    }

    for (let index = prevStart; index <= prevEnd; index += 1) {
      if (index >= safeStart && index <= safeEnd) {
        continue;
      }
      const item = imageItems.value[index];
      if (item) {
        releaseThumbnail(item);
        cancelPendingThumbnail(item.path);
      }
    }
  };

  const clearThumbnailCache = (): void => {
    for (const item of imageItems.value) {
      releaseThumbnail(item);
    }
    loadingThumbnails.clear();
    pendingThumbnails.length = 0;
    pendingThumbnailMap.clear();
    activeThumbnailJobs = 0;
    currentVisibleRange = { start: 0, end: -1 };
    visiblePaths.clear();
  };

  const removeThumbnailFromCache = (path: string): void => {
    const item = getItemByPath(path);
    if (item) {
      releaseThumbnail(item);
    }
    loadingThumbnails.delete(path);
    pendingThumbnailMap.delete(path);
    visiblePaths.delete(path);
  };

  return {
    loadThumbnail,
    setThumbnailVisibleRange,
    clearThumbnailCache,
    removeThumbnailFromCache
  };
};
