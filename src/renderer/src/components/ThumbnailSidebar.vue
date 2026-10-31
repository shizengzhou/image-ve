<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';

import type { ImageItem } from '@shared/types';

const props = defineProps<{
  items: ImageItem[];
  currentIndex: number;
  searchActionId: number;
}>();

const emit = defineEmits<{
  (event: 'select', index: number): void;
  (event: 'request-thumbnail', index: number, maxSize?: number): void;
  (event: 'visible-range', startIndex: number, endIndex: number): void;
}>();

const scrollerRef = ref<{ $el?: HTMLElement } | null>(null);
const thumbnailMaxSize = ref(200);
const itemSize = 65;
const baseThumbnailSize = 60;

const visibleStartIndex = ref(0);
const visibleEndIndex = ref(0);
let thumbnailRequestRaf = 0;
let pendingThumbnailRequest = false;
const isUserScrolling = ref(false);
let userScrollTimer = 0;
let programmaticScrollUntil = 0;

const markScrollActivity = (): void => {
  isUserScrolling.value = true;
  if (userScrollTimer) {
    window.clearTimeout(userScrollTimer);
  }
  userScrollTimer = window.setTimeout(() => {
    isUserScrolling.value = false;
  }, 700);
};

// Smooth centering also fires 'scroll' events; ignore those so they don't extend
// the guard and suppress legitimate navigation centering.
const handleScrollerScroll = (): void => {
  if (performance.now() < programmaticScrollUntil) {
    return;
  }
  markScrollActivity();
};

onBeforeUnmount(() => {
  if (userScrollTimer) {
    window.clearTimeout(userScrollTimer);
  }
});

const centerActiveThumbnail = async (): Promise<void> => {
  await nextTick();
  requestAnimationFrame(() => {
    const scroller = scrollerRef.value as { $el?: HTMLElement } | null;
    const container = scroller?.$el;
    if (!container) {
      return;
    }
    const paddingTop = 10;
    const targetTop =
      props.currentIndex * itemSize + paddingTop - (container.clientHeight - itemSize) / 2;
    const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextTop = Math.min(Math.max(0, targetTop), maxTop);
    programmaticScrollUntil = performance.now() + 600;
    container.scrollTo({ top: nextTop, behavior: 'smooth' });
  });
};

const handleUpdate = (
  _startIndex: number,
  _endIndex: number,
  startIndex: number,
  endIndex: number
): void => {
  if (props.items.length === 0) {
    return;
  }
  if (visibleStartIndex.value === startIndex && visibleEndIndex.value === endIndex) {
    return;
  }
  visibleStartIndex.value = startIndex;
  visibleEndIndex.value = endIndex;
  emit('visible-range', startIndex, endIndex);
  requestVisibleThumbnails();
};

const handleSelect = (index: number | undefined, item: ImageItem | undefined): void => {
  if ((typeof index !== 'number' || Number.isNaN(index)) && item) {
    const foundIndex = props.items.findIndex((entry) => entry.path === item.path);
    if (foundIndex >= 0) {
      emit('select', foundIndex);
      return;
    }
  }
  if (typeof index !== 'number' || Number.isNaN(index)) {
    return;
  }
  emit('select', index);
};

onMounted(() => {
  const nextSize = Math.ceil(baseThumbnailSize * window.devicePixelRatio);
  if (nextSize > 0) {
    thumbnailMaxSize.value = nextSize;
  }
});

const requestVisibleThumbnails = (): void => {
  if (props.items.length === 0) return;

  if (thumbnailRequestRaf !== 0) {
    pendingThumbnailRequest = true;
    return;
  }

  thumbnailRequestRaf = requestAnimationFrame(() => {
    thumbnailRequestRaf = 0;
    const shouldRetry = pendingThumbnailRequest;
    pendingThumbnailRequest = false;

    for (let index = visibleStartIndex.value; index <= visibleEndIndex.value; index += 1) {
      const item = props.items[index];
      if (item && !item.thumbnailSrc) {
        emit('request-thumbnail', index, thumbnailMaxSize.value);
      }
    }

    if (shouldRetry) {
      requestVisibleThumbnails();
    }
  });
};

const requestCurrentThumbnail = (): void => {
  const current = props.currentIndex;
  if (current >= 0 && current < props.items.length) {
    emit('request-thumbnail', current, thumbnailMaxSize.value);
  }
};

watch(
  () => props.currentIndex,
  () => {
    if (props.items.length === 0) {
      return;
    }
    if (!isUserScrolling.value) {
      void centerActiveThumbnail();
    }
    requestCurrentThumbnail();
  },
  { immediate: true }
);

watch(
  () => props.searchActionId,
  () => {
    if (props.items.length === 0) {
      return;
    }
    void centerActiveThumbnail();
    requestCurrentThumbnail();
  }
);

watch(
  () => props.items,
  () => {
    void nextTick(() => {
      requestVisibleThumbnails();
    });
  }
);
</script>

<template>
  <aside class="sidebar">
    <RecycleScroller
      ref="scrollerRef"
      class="thumbnail-scroller"
      :items="items"
      :item-size="itemSize"
      key-field="path"
      :emit-update="true"
      list-class="thumbnail-list"
      item-class="thumbnail-wrapper"
      @update="handleUpdate"
      @scroll.passive="handleScrollerScroll"
      @wheel.passive="markScrollActivity"
      @pointerdown="markScrollActivity"
    >
      <template #default="{ item, index }">
        <button
          class="thumbnail"
          :class="{ active: item.path === items[currentIndex]?.path }"
          @click="handleSelect(index, item)"
        >
          <img
            v-if="item.thumbnailSrc"
            :src="item.thumbnailSrc"
            :alt="item.name"
            :title="item.name"
            loading="lazy"
            @contextmenu.prevent
          />
        </button>
      </template>
    </RecycleScroller>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 81px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow: hidden;
}

.thumbnail-scroller {
  height: 100%;
  padding: 10px 8px;
}

.thumbnail {
  height: 60px;
  border-radius: 4px;
  border: 2px solid transparent;
  background: transparent;
  padding: 0;
  width: 100%;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.thumbnail.active {
  outline: 2px solid var(--thumbnail-active);
}
</style>
