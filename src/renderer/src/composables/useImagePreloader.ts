import { ref, type Ref, watch } from 'vue';

import type { ImageItem } from '@shared/types';
import { getMime, isImgTag } from '../utils/mime';

type CacheEntry = { bitmap?: ImageBitmap; src?: string };

export function useImagePreloader(
  imageItems: Ref<ImageItem[]>,
  currentIndex: Ref<number>,
  currentImage: Ref<ImageItem | undefined>,
  options: {
    isSoftRefreshing?: Ref<boolean>;
    containerDimensions?: Ref<{ width: number; height: number }>;
  } = {}
) {
  const loadingFullImages = new Set<string>();
  const queuedFullImages = new Set<string>();
  let activeFullJobs = 0;
  const minPreloadConcurrency = 2;
  const maxPreloadConcurrency = 4;
  const maxFullImageConcurrency = ref(2);
  const minPreloadRange = 2;
  const maxPreloadRange = 4;
  const mainPreloadRange = ref(3);
  const lastIndex = ref(currentIndex.value);
  const priorityQueue: string[] = [];
  const isMainLoading = ref(false);
  const fullImageCache = new Map<string, CacheEntry>();
  const maxCacheCount = 16;
  const requestVersion = ref(0);
  const imageIndexMap = new Map<string, number>();

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

  rebuildIndexMap(imageItems.value);

  const touchFullImage = (path: string): void => {
    const entry = fullImageCache.get(path);
    if (!entry) return;
    fullImageCache.delete(path);
    fullImageCache.set(path, entry);
  };

  const evictFullImages = (): void => {
    if (fullImageCache.size <= maxCacheCount) {
      return;
    }
    const currentPath = currentImage.value?.path;

    for (const [path, entry] of Array.from(fullImageCache.entries())) {
      if (fullImageCache.size <= maxCacheCount) {
        break;
      }
      if (path === currentPath) {
        continue;
      }
      fullImageCache.delete(path);
      entry.bitmap?.close();
      if (entry.src) {
        URL.revokeObjectURL(entry.src);
      }
      const item = getItemByPath(path);
      if (item && item.bitmap === entry.bitmap) {
        item.bitmap = null;
      }
      if (item && item.src === entry.src) {
        item.src = null;
      }
    }
  };

  const decodeFullImage = async (target: ImageItem, version: number): Promise<void> => {
    if (target.loadError) {
      return;
    }
    if (target.bitmap || target.src) {
      touchFullImage(target.path);
      if (target.bitmap) {
        evictFullImages();
      }
      return;
    }
    if (loadingFullImages.has(target.path)) {
      return;
    }

    const isCurrentImage = currentImage.value?.path === target.path;
    const isVersionMatch = version === requestVersion.value;
    if (isCurrentImage && !isVersionMatch) {
      return;
    }
    if (!isCurrentImage && !isVersionMatch && (target.bitmap || target.src)) {
      return;
    }

    loadingFullImages.add(target.path);
    if (currentImage.value?.path === target.path && version === requestVersion.value) {
      isMainLoading.value = true;
    }

    const targetPath = target.path;

    try {
      if (!target.bitmap && !target.src) {
        const arrayBuffer = await window.electron.decodeImageBytes(targetPath);
        if (!arrayBuffer || arrayBuffer.byteLength === 0) {
          throw new Error('Empty image data');
        }

        let mime = target.mime;
        if (!mime) {
          mime = await getMime(arrayBuffer);
          // Large / unusual SVGs may not be detected by content sniffing.
          // Always treat .svg as vector so it is rendered via <img> instead of
          // being fed to createImageBitmap / ImageMagick.
          if (targetPath.toLowerCase().endsWith('.svg')) {
            mime = 'image/svg+xml';
          }
          target.mime = mime;
        }

        if (isImgTag(mime)) {
          // Set the blob URL immediately: waiting for an ImageMagick size probe
          // makes the <img> render as a broken image with its alt text first.
          // Dimensions arrive from the <img> load event instead.
          const url = URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));

          target.src = url;
          target.loadError = null;

          const existing = fullImageCache.get(targetPath);
          if (existing?.src) {
            URL.revokeObjectURL(existing.src);
          }
          fullImageCache.delete(targetPath);
          fullImageCache.set(targetPath, { src: url });
          touchFullImage(targetPath);
          evictFullImages();
        } else {
          const blob = new Blob([arrayBuffer], { type: mime });
          const bitmap = await createImageBitmap(blob);

          target.width = bitmap.width;
          target.height = bitmap.height;
          target.bitmap = bitmap;
          target.loadError = null;

          const existing = fullImageCache.get(targetPath);
          existing?.bitmap?.close();
          fullImageCache.delete(targetPath);
          fullImageCache.set(targetPath, { bitmap });
          touchFullImage(targetPath);
          evictFullImages();
        }

        if (target.width && target.height && options.containerDimensions?.value) {
          const container = options.containerDimensions.value;
          if (container.width && container.height) {
            if (target.width > container.width || target.height > container.height) {
              target.fitMode = 'window';
              target.zoom = Math.min(
                container.width / target.width,
                container.height / target.height
              );
            } else {
              target.fitMode = 'actual';
              target.zoom = 1;
            }
          }
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const stillRelevant =
        version === requestVersion.value || currentImage.value?.path === targetPath;
      if (stillRelevant) {
        target.loadError = detail;
      }
    } finally {
      loadingFullImages.delete(targetPath);
      if (currentImage.value?.path === targetPath && version === requestVersion.value) {
        isMainLoading.value = false;
      }
    }
  };

  const runPreloadQueue = (): void => {
    while (activeFullJobs < maxFullImageConcurrency.value && priorityQueue.length > 0) {
      const path = priorityQueue.shift();
      if (!path) {
        continue;
      }
      queuedFullImages.delete(path);
      if (loadingFullImages.has(path)) {
        continue;
      }
      const target = getItemByPath(path);
      if (!target) {
        continue;
      }

      activeFullJobs += 1;
      void (async () => {
        const version = requestVersion.value;
        const startedAt = Date.now();
        try {
          await decodeFullImage(target, version);
        } finally {
          const elapsed = Date.now() - startedAt;
          if (elapsed < 250) {
            mainPreloadRange.value = Math.min(maxPreloadRange, mainPreloadRange.value + 1);
            maxFullImageConcurrency.value = Math.min(
              maxPreloadConcurrency,
              maxFullImageConcurrency.value + 1
            );
          } else if (elapsed > 1200) {
            mainPreloadRange.value = Math.max(minPreloadRange, mainPreloadRange.value - 1);
            maxFullImageConcurrency.value = Math.max(
              minPreloadConcurrency,
              maxFullImageConcurrency.value - 1
            );
          }
          activeFullJobs = Math.max(0, activeFullJobs - 1);
          runPreloadQueue();
        }
      })();
    }
  };

  const loadFullImage = async (): Promise<void> => {
    const target = currentImage.value;
    if (!target) return;

    if (target.bitmap || target.src) {
      touchFullImage(target.path);
      return;
    }
    if (loadingFullImages.has(target.path)) return;
    if (activeFullJobs >= maxFullImageConcurrency.value) {
      return;
    }

    activeFullJobs += 1;
    const version = requestVersion.value;
    await decodeFullImage(target, version);
    activeFullJobs = Math.max(0, activeFullJobs - 1);
    runPreloadQueue();
  };

  const buildPriorityIndices = (current: number, length: number, direction: number): number[] => {
    const indices: number[] = [];
    if (length <= 0 || current < 0 || current >= length) {
      return indices;
    }
    const primarySign = direction >= 0 ? 1 : -1;
    const secondarySign = -primarySign;
    indices.push(current);
    for (let offset = 1; offset <= mainPreloadRange.value; offset += 1) {
      const primary = current + offset * primarySign;
      if (primary >= 0 && primary < length) {
        indices.push(primary);
      }
      const secondary = current + offset * secondarySign;
      if (secondary >= 0 && secondary < length) {
        indices.push(secondary);
      }
    }
    return indices;
  };

  const rebuildPreloadQueues = (): void => {
    const length = imageItems.value.length;
    const current = currentIndex.value;
    if (length === 0 || current < 0 || current >= length) {
      priorityQueue.length = 0;
      queuedFullImages.clear();
      return;
    }

    const direction = current >= lastIndex.value ? 1 : -1;
    const indices = buildPriorityIndices(current, length, direction);

    const newQueue: string[] = [];
    const newSet = new Set<string>();
    for (const index of indices) {
      const target = imageItems.value[index];
      if (!target || target.bitmap || target.src || loadingFullImages.has(target.path)) {
        continue;
      }
      if (!newSet.has(target.path)) {
        newSet.add(target.path);
        newQueue.push(target.path);
      }
    }
    for (const path of priorityQueue) {
      if (newSet.has(path) && !loadingFullImages.has(path)) {
        newSet.delete(path);
        newQueue.unshift(path);
      }
    }

    priorityQueue.length = 0;
    priorityQueue.push(...newQueue);
    queuedFullImages.clear();
    for (const path of newQueue) {
      queuedFullImages.add(path);
    }

    lastIndex.value = current;
    runPreloadQueue();
  };

  watch(
    () => imageItems.value,
    (next, previous) => {
      if (next === previous) {
        return;
      }
      rebuildIndexMap(next);

      if (options.isSoftRefreshing?.value) {
        const nextPaths = new Set(next.map((item) => item.path));
        for (const [path, entry] of Array.from(fullImageCache.entries())) {
          if (nextPaths.has(path)) {
            continue;
          }
          fullImageCache.delete(path);
          entry.bitmap?.close();
          if (entry.src) {
            URL.revokeObjectURL(entry.src);
          }
        }
      } else {
        fullImageCache.forEach((entry) => {
          entry.bitmap?.close();
          if (entry.src) {
            URL.revokeObjectURL(entry.src);
          }
        });
        fullImageCache.clear();
        for (const item of next) {
          if (item.bitmap) {
            item.bitmap = null;
          }
          if (item.src) {
            URL.revokeObjectURL(item.src);
            item.src = null;
          }
        }
      }

      if (next.length > 0) {
        rebuildPreloadQueues();
      }
    }
  );

  watch(isMainLoading, (value) => {
    if (!value) {
      runPreloadQueue();
    }
  });

  return {
    isMainLoading,
    requestVersion,
    loadFullImage,
    rebuildPreloadQueues,
    runPreloadQueue,
    preloadPriority: (index: number): void => {
      const target = imageItems.value[index];
      if (!target || loadingFullImages.has(target.path) || queuedFullImages.has(target.path)) {
        return;
      }
      if (target.bitmap) {
        touchFullImage(target.path);
        evictFullImages();
        return;
      }
      if (target.src) {
        return;
      }
      queuedFullImages.add(target.path);
      priorityQueue.unshift(target.path);
      runPreloadQueue();
    },
    mainPreloadRange,
    fullImageCache
  };
}
