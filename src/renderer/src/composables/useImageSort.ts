import type { Ref } from 'vue';

import type { FileMetadata, ImageItem, SortKey, SortOrder } from '@shared/types';
import { getExtension, parseCapturedAt } from '../utils/formatter';

export const sortKeys: readonly SortKey[] = [
  'name',
  'extension',
  'modified',
  'created',
  'captured',
  'size'
];

export const fileMetadataCache = new Map<string, FileMetadata>();

const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> => {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item !== undefined) {
        await fn(item);
      }
    }
  });
  await Promise.all(workers);
};

const METADATA_IPC_CONCURRENCY = 8;

const metadataSortKeys = new Set<SortKey>(['modified', 'created', 'captured', 'size']);

export const useImageSort = (sortKey: Ref<SortKey>, sortOrder: Ref<SortOrder>) => {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  const ensureFileMetadata = async (items: ImageItem[]): Promise<void> => {
    if (!metadataSortKeys.has(sortKey.value)) {
      return;
    }

    const pending = items.filter((item) => !fileMetadataCache.has(item.path));
    if (pending.length === 0) {
      return;
    }

    await runWithConcurrency(pending, METADATA_IPC_CONCURRENCY, async (item) => {
      try {
        const metadata = await window.electron.readFileMetadata(item.path);
        fileMetadataCache.set(item.path, metadata);
      } catch {
        // Metadata unavailable for this file; skip
      }
    });
  };

  const getSortNumber = (item: ImageItem): number | null => {
    const metadata = fileMetadataCache.get(item.path);
    if (!metadata) {
      return null;
    }
    if (sortKey.value === 'size') {
      return metadata.size ?? null;
    }
    if (sortKey.value === 'modified') {
      return metadata.modified ?? null;
    }
    if (sortKey.value === 'created') {
      return metadata.created ?? null;
    }
    if (sortKey.value === 'captured') {
      return parseCapturedAt(metadata.capturedAt);
    }
    return null;
  };

  const compareByName = (left: ImageItem, right: ImageItem): number => {
    const order = sortOrder.value === 'asc' ? 1 : -1;
    const nameCompare = collator.compare(left.name, right.name);
    return nameCompare !== 0 ? nameCompare * order : left.path.localeCompare(right.path) * order;
  };

  const sortItems = async (items: ImageItem[]): Promise<ImageItem[]> => {
    await ensureFileMetadata(items);

    const order = sortOrder.value === 'asc' ? 1 : -1;
    const sorted = [...items];
    sorted.sort((left, right) => {
      if (sortKey.value === 'name') {
        return compareByName(left, right);
      }

      if (sortKey.value === 'extension') {
        const leftExt = getExtension(left.path);
        const rightExt = getExtension(right.path);
        const extCompare = collator.compare(leftExt, rightExt);
        if (extCompare !== 0) {
          return extCompare * order;
        }
        return compareByName(left, right);
      }

      const leftValue = getSortNumber(left);
      const rightValue = getSortNumber(right);

      if (leftValue == null && rightValue == null) {
        return compareByName(left, right);
      }
      if (leftValue == null) {
        return 1;
      }
      if (rightValue == null) {
        return -1;
      }

      const diff = leftValue - rightValue;
      if (diff !== 0) {
        return diff * order;
      }
      return compareByName(left, right);
    });

    return sorted;
  };

  return {
    sortItems,
    clearFileMetadataCache: (): void => {
      fileMetadataCache.clear();
    },
    deleteFileMetadata: (path: string): void => {
      fileMetadataCache.delete(path);
    }
  };
};
