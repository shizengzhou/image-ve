import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';

import type { ImageItem } from '@shared/types';

export const useImagePlayback = (
  imageItems: Ref<ImageItem[]>,
  currentIndex: Ref<number>,
  hasImages: Ref<boolean>,
  isInfoOpen: Ref<boolean>,
  autoplayIntervalMs: Ref<number> = ref(2000)
) => {
  const isPlaying = ref(false);
  let playbackTimer: number | null = null;

  const hasNext = computed(
    () => hasImages.value && currentIndex.value < imageItems.value.length - 1
  );

  const stopPlayback = (): void => {
    if (playbackTimer !== null) {
      window.clearInterval(playbackTimer);
      playbackTimer = null;
    }
    isPlaying.value = false;
  };

  const startPlayback = (): void => {
    if (!hasImages.value || imageItems.value.length < 2 || playbackTimer !== null) {
      return;
    }
    isPlaying.value = true;
    playbackTimer = window.setInterval(() => {
      if (!hasImages.value) {
        stopPlayback();
        return;
      }
      if (hasNext.value) {
        currentIndex.value += 1;
        return;
      }
      stopPlayback();
    }, autoplayIntervalMs.value);
  };

  const togglePlayback = (): void => {
    if (isPlaying.value) {
      stopPlayback();
      return;
    }
    startPlayback();
  };

  watch(hasImages, (value) => {
    if (!value) {
      stopPlayback();
      isInfoOpen.value = false;
    }
  });

  onBeforeUnmount(stopPlayback);

  return {
    isPlaying,
    togglePlayback,
    stopPlayback
  };
};
