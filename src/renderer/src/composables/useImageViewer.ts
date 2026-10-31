import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';

import type { ImageItem } from '@shared/types';
import { isMac } from '../utils/platform';
import { useImageMetadata } from './useImageMetadata';
import { useImagePlayback } from './useImagePlayback';
import { useImagePreloader } from './useImagePreloader';
import { useImageSearch } from './useImageSearch';
import { useImageTransform } from './useImageTransform';

export const useImageViewer = (
  imageItems: Ref<ImageItem[]>,
  currentIndex: Ref<number>,
  options: { isSoftRefreshing?: Ref<boolean>; autoplayIntervalMs?: Ref<number> } = {}
) => {
  const autoplayIntervalMs = options.autoplayIntervalMs ?? ref(2000);
  const hasImages = computed(() => imageItems.value.length > 0);
  const currentImage = computed(() => imageItems.value[currentIndex.value]);

  const hasPrev = computed(() => hasImages.value && currentIndex.value > 0);
  const hasNext = computed(
    () => hasImages.value && currentIndex.value < imageItems.value.length - 1
  );
  const pageIndicator = computed(() => {
    if (!hasImages.value) {
      return '0/0';
    }
    return `${currentIndex.value + 1}/${imageItems.value.length}`;
  });

  const isInfoOpen = ref(false);
  const toggleInfoPanel = (): void => {
    if (!currentImage.value) {
      return;
    }
    isInfoOpen.value = !isInfoOpen.value;
  };

  const {
    fileMetadata,
    isLoading: isMetadataLoading,
    loadFileMetadata
  } = useImageMetadata(currentImage);

  const {
    isSearchOpen,
    searchQuery,
    searchHasResults,
    searchMatchCount,
    searchActiveIndex,
    searchActionId,
    setSearchQuery,
    performSearch,
    searchNext,
    searchPrev,
    closeSearch,
    openSearch,
    rebuildSearchMatches
  } = useImageSearch(imageItems, currentIndex);

  const { isPlaying, togglePlayback } = useImagePlayback(
    imageItems,
    currentIndex,
    hasImages,
    isInfoOpen,
    autoplayIntervalMs
  );

  const {
    isPanning,
    canPanImage,
    imageDimensions,
    imageStyle,
    zoomPercentage,
    containerDimensions,
    setImageStageRef,
    setCanvasRef,
    updateImageDimensions,
    resetPan,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    zoomIn,
    zoomOut,
    rotateRight,
    flipHorizontal,
    setFitMode,
    initFitMode,
    scheduleRender
  } = useImageTransform(currentImage);

  const {
    isMainLoading,
    requestVersion,
    loadFullImage,
    rebuildPreloadQueues,
    preloadPriority,
    mainPreloadRange
  } = useImagePreloader(imageItems, currentIndex, currentImage, {
    ...options,
    containerDimensions
  });

  const selectIndex = (index: number): void => {
    if (index < 0 || index >= imageItems.value.length) {
      return;
    }
    currentIndex.value = index;
  };

  let lastSwitchTime = 0;
  const minSwitchInterval = 80;

  const showNext = (): void => {
    const now = Date.now();
    if (now - lastSwitchTime < minSwitchInterval) {
      return;
    }
    if (!hasNext.value) {
      return;
    }
    lastSwitchTime = now;
    currentIndex.value += 1;
  };

  const showPrev = (): void => {
    const now = Date.now();
    if (now - lastSwitchTime < minSwitchInterval) {
      return;
    }
    if (!hasPrev.value) {
      return;
    }
    lastSwitchTime = now;
    currentIndex.value -= 1;
  };

  const showFirst = (): void => {
    if (!hasImages.value || currentIndex.value === 0) {
      return;
    }
    currentIndex.value = 0;
  };

  const showLast = (): void => {
    if (!hasImages.value || currentIndex.value === imageItems.value.length - 1) {
      return;
    }
    currentIndex.value = imageItems.value.length - 1;
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (!hasImages.value) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }
    if (document.querySelector('.context-menu') !== null) {
      return;
    }
    if (event.key === 'Escape' && isSearchOpen.value) {
      event.preventDefault();
      closeSearch();
      return;
    }
    if (event.key === 'ArrowLeft') {
      showPrev();
    }
    if (event.key === 'ArrowRight') {
      showNext();
    }
    if (event.key === 'Home') {
      event.preventDefault();
      showFirst();
    }
    if (event.key === 'End') {
      event.preventDefault();
      showLast();
    }

    const hasModifier = isMac ? event.metaKey : event.ctrlKey;
    if (!hasModifier) {
      return;
    }
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      if (isSearchOpen.value) {
        const input = document.querySelector<HTMLInputElement>('.search-box input');
        input?.focus();
        input?.select();
      } else {
        openSearch();
      }
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomIn();
      return;
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomOut();
      return;
    }
    if (event.key === '9') {
      event.preventDefault();
      setFitMode('window');
      return;
    }
    if (event.key === '0') {
      event.preventDefault();
      setFitMode('actual');
      return;
    }
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault();
      rotateRight();
      return;
    }
    if (event.key.toLowerCase() === 't') {
      event.preventDefault();
      flipHorizontal();
      return;
    }
    if (event.key.toLowerCase() === 'i' && !event.shiftKey) {
      event.preventDefault();
      toggleInfoPanel();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  const handleImageLoad = (event?: Event): void => {
    const image = event?.target as HTMLImageElement | null;
    if (image?.naturalWidth && image.naturalHeight) {
      const item = currentImage.value;
      if (item) {
        item.width = image.naturalWidth;
        item.height = image.naturalHeight;
      }
    }
    updateImageDimensions();
    initFitMode();
    resetPan();
    isMainLoading.value = false;
  };

  watch(
    () => currentImage.value?.path,
    () => {
      requestVersion.value += 1;
      imageDimensions.value = null;
      resetPan();
      loadFullImage();
      loadFileMetadata();
      rebuildPreloadQueues();
      scheduleRender();
      if (!currentImage.value) {
        isInfoOpen.value = false;
      }
    },
    { immediate: true }
  );

  watch(
    () => currentImage.value?.bitmap,
    (bitmap) => {
      if (!bitmap) return;
      updateImageDimensions();
      initFitMode();
      resetPan();
      isMainLoading.value = false;
      scheduleRender();
    }
  );

  watch(
    () => imageItems.value,
    (next, previous) => {
      if (next === previous) {
        return;
      }
      if (isSearchOpen.value) {
        rebuildSearchMatches();
      }
    }
  );

  return {
    hasImages,
    currentImage,
    imageStyle,
    setImageStageRef,
    setCanvasRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isPanning,
    canPanImage,
    isSearchOpen,
    searchQuery,
    searchHasResults,
    searchMatchCount,
    searchActiveIndex,
    searchActionId,
    setSearchQuery,
    performSearch,
    searchNext,
    searchPrev,
    closeSearch,
    openSearch,
    hasPrev,
    hasNext,
    zoomPercentage,
    pageIndicator,
    fileMetadata,
    isMetadataLoading,
    selectIndex,
    showNext,
    showPrev,
    showFirst,
    showLast,
    zoomIn,
    zoomOut,
    rotateRight,
    flipHorizontal,
    setFitMode,
    isInfoOpen,
    toggleInfoPanel,
    isPlaying,
    togglePlayback,
    preloadPriority,
    handleImageLoad,
    isMainLoading,
    mainPreloadRange
  };
};
