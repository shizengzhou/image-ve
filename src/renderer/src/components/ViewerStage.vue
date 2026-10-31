<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import type { CSSProperties, VNodeRef } from 'vue';
import { computed } from 'vue';

import type { ImageItem } from '@shared/types';
import { isImgTag } from '../utils/mime';
import BaseAlert from './base/BaseAlert.vue';
import BaseLoading from './base/BaseLoading.vue';
import IconNext from './icons/IconNext.vue';
import IconPrev from './icons/IconPrev.vue';
import SearchBox from './SearchBox.vue';

const props = defineProps<{
  currentImage?: ImageItem;
  imageStyle: CSSProperties;
  setImageStageRef: VNodeRef;
  setCanvasRef: VNodeRef;
  onPointerDown: (event: PointerEvent) => void;
  onPointerMove: (event: PointerEvent) => void;
  onPointerUp: (event: PointerEvent) => void;
  onWheel: (event: WheelEvent) => void;
  searchOpen: boolean;
  searchValue: string;
  searchHasResults: boolean;
  searchMatchCount: number | null;
  searchActiveIndex: number | null;
  onSearchInput: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchNext: () => void;
  onSearchPrev: () => void;
  onSearchClose: () => void;
  infoPanelOpen?: boolean;
  isPanning: boolean;
  canPan: boolean;
  onLoad: (event: Event) => void;
  hasPrev: boolean;
  hasNext: boolean;
  isLoading: boolean;
  isAppLoading?: boolean;
  statusMessage?: string | null;
}>();

const emit = defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
  (event: 'context-menu'): void;
  (event: 'dismiss-status'): void;
}>();

const { t } = useTranslation();

const handleContextMenu = (): void => {
  if (!props.currentImage) {
    return;
  }
  emit('context-menu');
};

const hasContent = computed(() => !!props.currentImage?.src || !!props.currentImage?.bitmap);
</script>

<template>
  <section class="viewer">
    <Transition name="status-fade">
      <BaseAlert
        v-if="statusMessage"
        class="status-alert"
        :message="statusMessage"
        @close="emit('dismiss-status')"
      />
    </Transition>
    <div
      :ref="setImageStageRef"
      class="image-stage"
      :class="{ 'is-panning': isPanning, 'can-pan': canPan }"
      @contextmenu.prevent="handleContextMenu"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel="onWheel"
    >
      <!-- <img> formats (SVG / GIF / WebP): rendered with CSS transforms -->
      <img
        v-if="isImgTag(currentImage?.mime || '') && currentImage?.src"
        :src="currentImage?.src || undefined"
        :alt="currentImage?.name"
        :style="imageStyle"
        :width="currentImage?.width"
        :height="currentImage?.height"
        draggable="false"
        @load="onLoad($event)"
      />
      <!-- Raster formats: rendered via <canvas> -->
      <canvas v-else :ref="setCanvasRef" class="render-canvas"></canvas>
      <BaseLoading
        v-if="(isLoading || (!hasContent && !currentImage?.loadError)) && !isAppLoading"
        overlay
      />
      <SearchBox
        :open="searchOpen"
        :value="searchValue"
        :has-results="searchHasResults"
        :result-total="searchMatchCount"
        :result-index="searchActiveIndex"
        :info-panel-open="infoPanelOpen"
        :on-input="onSearchInput"
        :on-submit="onSearchSubmit"
        :on-prev="onSearchPrev"
        :on-next="onSearchNext"
        :on-close="onSearchClose"
      />
    </div>
    <div v-if="hasPrev" class="nav-zone nav-zone-left">
      <button class="nav-button" :aria-label="t('viewer.prev')" @click="emit('prev')">
        <IconPrev />
      </button>
    </div>
    <div
      v-if="hasNext"
      class="nav-zone nav-zone-right"
      :class="{ 'info-panel-open': infoPanelOpen }"
    >
      <button class="nav-button" :aria-label="t('viewer.next')" @click="emit('next')">
        <IconNext />
      </button>
    </div>
  </section>
</template>

<style scoped>
.viewer {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.image-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}

.image-stage.can-pan {
  cursor: grab;
}

.image-stage.can-pan.is-panning {
  cursor: grabbing;
}

.image-stage img {
  user-select: none;
  -webkit-user-select: none;
  background-color: var(--checker-bg);
  background-image:
    linear-gradient(45deg, var(--checker-square) 25%, transparent 25%),
    linear-gradient(-45deg, var(--checker-square) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--checker-square) 75%),
    linear-gradient(-45deg, transparent 75%, var(--checker-square) 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
  will-change: transform;
}

.render-canvas {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
  -webkit-user-select: none;
}

.nav-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 54px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 8px;
  pointer-events: auto;
}

.nav-zone-left {
  left: 0;
}

.nav-zone-right {
  right: 0;
  justify-content: flex-end;
}

.nav-zone-right.info-panel-open {
  right: 280px;
}

.nav-button {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(26, 32, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e7e9ed;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease,
    visibility 0s linear 0.2s;
  will-change: opacity, visibility;
}

.nav-zone:hover .nav-button {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

.nav-button:hover {
  background: rgba(26, 32, 38, 0.85);
  border-color: rgba(255, 255, 255, 0.16);
}

.nav-button svg {
  width: 18px;
  height: 18px;
}

.status-alert {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  pointer-events: auto;
  width: 100%;
}

.status-fade-enter-active,
.status-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.status-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

.status-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
