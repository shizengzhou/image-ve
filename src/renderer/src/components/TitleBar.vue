<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { isMac } from '../utils/platform';

const props = defineProps<{
  title?: string;
}>();

const isFullscreen = ref(false);
let unsubscribe: (() => void) | undefined;

onMounted(async () => {
  isFullscreen.value = await window.electron.windowIsFullscreen();
  unsubscribe = window.electron.onWindowFullscreenChanged((value) => {
    isFullscreen.value = value;
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

<template>
  <div v-if="!isFullscreen" class="title-bar" :class="{ mac: isMac }">
    <div class="title-bar-left">
      <slot name="left"></slot>
    </div>
    <div class="title-bar-center" :class="{ win: !isMac }">
      <span class="title-bar-text">{{ props.title || 'ImageVE' }}</span>
    </div>
    <div class="title-bar-right">
      <slot name="right"></slot>
    </div>
  </div>
</template>

<style scoped>
.title-bar {
  position: relative;
  height: 32px;
  display: flex;
  background: transparent;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  -webkit-app-region: drag;
  app-region: drag;
}

.title-bar.mac {
  padding: 0 80px;
}

.title-bar-left {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.title-bar:not(.mac) .title-bar-left {
  padding-left: 10px;
}

.title-bar-right {
  display: flex;
  justify-content: flex-end;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.title-bar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}

.title-bar-center.win {
  justify-content: flex-start;
  padding: 0 10px;
}

.title-bar-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  pointer-events: none;
}
</style>
