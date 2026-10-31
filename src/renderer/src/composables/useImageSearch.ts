import { computed, ref, type Ref } from 'vue';

import type { ImageItem } from '@shared/types';

export const useImageSearch = (imageItems: Ref<ImageItem[]>, currentIndex: Ref<number>) => {
  const isSearchOpen = ref(false);
  const searchQuery = ref('');
  const searchMatches = ref<number[] | null>(null);
  const searchActiveIndex = ref(-1);
  const searchActionId = ref(0);
  const searchHasResults = computed(() => (searchMatches.value?.length ?? 0) > 0);
  const searchMatchCount = computed(() => searchMatches.value?.length ?? null);

  const setSearchQuery = (value: string): void => {
    searchQuery.value = value;
    if (value.trim().length === 0) {
      searchMatches.value = null;
      searchActiveIndex.value = -1;
    }
  };

  const openSearch = (): void => {
    isSearchOpen.value = true;
  };

  const closeSearch = (): void => {
    isSearchOpen.value = false;
    searchMatches.value = null;
    searchActiveIndex.value = -1;
  };

  const rebuildSearchMatches = (): void => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) {
      searchMatches.value = null;
      searchActiveIndex.value = -1;
      return;
    }

    const matches: number[] = [];
    for (const [index, item] of imageItems.value.entries()) {
      if ((item?.name ?? '').toLowerCase().includes(query)) {
        matches.push(index);
      }
    }

    searchMatches.value = matches;
    searchActiveIndex.value = matches.length > 0 ? 0 : -1;
  };

  const performSearch = (): void => {
    rebuildSearchMatches();
    if (!searchHasResults.value || searchActiveIndex.value < 0) {
      return;
    }
    const matches = searchMatches.value;
    if (!matches || matches.length === 0) {
      return;
    }
    const target = matches[0];
    if (target === undefined) {
      return;
    }
    currentIndex.value = target;
    searchActionId.value += 1;
  };

  const navigateSearch = (direction: 1 | -1): void => {
    if (!searchHasResults.value) {
      performSearch();
      return;
    }
    const matches = searchMatches.value;
    if (!matches || matches.length === 0) {
      return;
    }
    const total = matches.length;
    const nextIndex =
      searchActiveIndex.value < 0 ? 0 : (searchActiveIndex.value + direction + total) % total;
    searchActiveIndex.value = nextIndex;
    const target = matches[nextIndex];
    if (target === undefined) {
      return;
    }
    currentIndex.value = target;
    searchActionId.value += 1;
  };

  return {
    isSearchOpen,
    searchQuery,
    searchHasResults,
    searchMatchCount,
    searchActiveIndex,
    searchActionId,
    setSearchQuery,
    performSearch,
    searchNext: () => navigateSearch(1),
    searchPrev: () => navigateSearch(-1),
    closeSearch,
    openSearch,
    rebuildSearchMatches
  };
};
