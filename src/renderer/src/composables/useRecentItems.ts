import { onBeforeUnmount, ref } from 'vue';

import type { RecentItem } from '@shared/types';
import { getMime } from '../utils/mime';
import { revokeObjectUrl } from '../utils/url';

export const useRecentItems = () => {
  const recentItems = ref<RecentItem[]>([]);

  const revokeAllThumbnails = (): void => {
    recentItems.value.forEach((item) => revokeObjectUrl(item.thumbnail ?? null));
  };

  onBeforeUnmount(revokeAllThumbnails);

  const loadRecentItems = async (loadImage = false): Promise<void> => {
    try {
      const items = await window.electron.getRecentItems();

      if (loadImage) {
        const fileItems = items.filter((item) => !item.isDirectory && !item.thumbnail);
        const results = await Promise.allSettled(
          fileItems.map((item) => window.electron.decodeThumbnail(item.path, 280))
        );

        for (let i = 0; i < results.length; i += 1) {
          const result = results[i];
          if (!result || result.status !== 'fulfilled') {
            continue;
          }
          const bytes = result.value;
          const mime = await getMime(bytes);
          fileItems[i]!.thumbnail = URL.createObjectURL(new Blob([bytes], { type: mime }));
        }
      }

      recentItems.value = items;
    } catch (error) {
      console.error('Failed to load recent items:', error);
    }
  };

  const clearRecentItems = async (): Promise<void> => {
    try {
      await window.electron.clearRecentItems();
      revokeAllThumbnails();
      recentItems.value = [];
    } catch (error) {
      console.error('Failed to clear recent items:', error);
    }
  };

  const removeRecentItem = async (path: string): Promise<void> => {
    try {
      await window.electron.removeRecentItem(path);
      const item = recentItems.value.find((entry) => entry.path === path);
      if (item) {
        revokeObjectUrl(item.thumbnail ?? null);
      }
      recentItems.value = recentItems.value.filter((entry) => entry.path !== path);
    } catch (error) {
      console.error('Failed to remove recent item:', error);
    }
  };

  return {
    recentItems,
    loadRecentItems,
    clearRecentItems,
    removeRecentItem
  };
};
