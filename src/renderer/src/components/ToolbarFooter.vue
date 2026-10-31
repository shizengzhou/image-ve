<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';

import { isMac } from '../utils/platform';
import BaseButton from './base/BaseButton.vue';
import IconFitActual from './icons/IconFitActual.vue';
import IconFitWindow from './icons/IconFitWindow.vue';
import IconFlipHorizontal from './icons/IconFlipHorizontal.vue';
import IconInfo from './icons/IconInfo.vue';
import IconNext from './icons/IconNext.vue';
import IconPause from './icons/IconPause.vue';
import IconPlay from './icons/IconPlay.vue';
import IconPrev from './icons/IconPrev.vue';
import IconRotateRight from './icons/IconRotateRight.vue';
import IconZoomIn from './icons/IconZoomIn.vue';
import IconZoomOut from './icons/IconZoomOut.vue';

defineProps<{
  zoomPercentage: string;
  pageIndicator: string;
  isPlaying: boolean;
  isInfoOpen: boolean;
}>();

const { t } = useTranslation();
const modifierLabel = computed(() => (isMac ? t('common.command') : t('common.ctrl')));

const emit = defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
  (event: 'zoomOut'): void;
  (event: 'zoomIn'): void;
  (event: 'fitWindow'): void;
  (event: 'fitActual'): void;
  (event: 'rotateRight'): void;
  (event: 'flipHorizontal'): void;
  (event: 'toggleInfo'): void;
  (event: 'play'): void;
}>();

const onMouseLeave = (): void => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};
</script>

<template>
  <div class="toolbar-shell" @mouseleave="onMouseLeave">
    <div class="toolbar">
      <div class="toolbar-group">
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.prev')"
          @click="emit('prev')"
        >
          <IconPrev />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.prev') }}</div>
            <div class="tooltip-shortcut">{{ t('toolbar.shortcut', { shortcut: '←' }) }}</div>
          </div>
        </BaseButton>
        <div class="toolbar-text">{{ pageIndicator }}</div>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.next')"
          @click="emit('next')"
        >
          <IconNext />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.next') }}</div>
            <div class="tooltip-shortcut">{{ t('toolbar.shortcut', { shortcut: '→' }) }}</div>
          </div>
        </BaseButton>
      </div>
      <div class="toolbar-group">
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.zoomOut')"
          @click="emit('zoomOut')"
        >
          <IconZoomOut />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.zoomOut') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + -` }) }}
            </div>
          </div>
        </BaseButton>
        <div class="toolbar-text">{{ zoomPercentage }}</div>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.zoomIn')"
          @click="emit('zoomIn')"
        >
          <IconZoomIn />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.zoomIn') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + +` }) }}
            </div>
          </div>
        </BaseButton>
      </div>
      <div class="toolbar-group">
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.fitWindow')"
          @click="emit('fitWindow')"
        >
          <IconFitWindow />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.fitWindow') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + 9` }) }}
            </div>
          </div>
        </BaseButton>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.fitActual')"
          @click="emit('fitActual')"
        >
          <IconFitActual />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.fitActual') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + 0` }) }}
            </div>
          </div>
        </BaseButton>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.rotateRight')"
          @click="emit('rotateRight')"
        >
          <IconRotateRight />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.rotateRight') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + R` }) }}
            </div>
          </div>
        </BaseButton>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="t('toolbar.flipHorizontal')"
          @click="emit('flipHorizontal')"
        >
          <IconFlipHorizontal />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.flipHorizontal') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + T` }) }}
            </div>
          </div>
        </BaseButton>
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :aria-label="isPlaying ? t('toolbar.pause') : t('toolbar.play')"
          @click="emit('play')"
        >
          <IconPause v-if="isPlaying" />
          <IconPlay v-else />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">
              {{ isPlaying ? t('toolbar.pause') : t('toolbar.play') }}
            </div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: t('common.none') }) }}
            </div>
          </div>
        </BaseButton>
      </div>
      <div class="toolbar-group toolbar-group-separated">
        <BaseButton
          class="toolbar-icon"
          size="lg"
          icon-only
          :active="isInfoOpen"
          :aria-label="t('toolbar.info')"
          @click="emit('toggleInfo')"
        >
          <IconInfo />
          <div class="toolbar-tooltip">
            <div class="tooltip-title">{{ t('toolbar.info') }}</div>
            <div class="tooltip-shortcut">
              {{ t('toolbar.shortcut', { shortcut: `${modifierLabel} + I` }) }}
            </div>
          </div>
        </BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toolbar-shell {
  position: fixed;
  left: 81px;
  right: 0;
  bottom: 0;
  height: 90px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 16px;
  z-index: 10;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 10px 18px;
  border-radius: 18px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  box-shadow: 0 8px 30px rgba(12, 16, 20, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  user-select: none;
  -webkit-user-select: none;
  will-change: opacity;
}

.toolbar-shell:hover .toolbar,
.toolbar-shell:focus-within .toolbar {
  opacity: 1;
  pointer-events: auto;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-group-separated {
  padding-left: 16px;
  margin-left: 4px;
  border-left: 1px solid var(--panel-border);
}

.toolbar-icon {
  width: 36px;
  height: 36px;
  position: relative;
}

.toolbar-icon svg {
  width: 18px;
  height: 18px;
}

.toolbar-tooltip {
  position: absolute;
  left: 50%;
  bottom: 46px;
  transform: translateX(-50%) translateY(6px);
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  z-index: 2;
}

.toolbar-icon:hover .toolbar-tooltip,
.toolbar-icon:focus-visible .toolbar-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.tooltip-title {
  font-size: 12px;
  color: var(--app-text);
}

.tooltip-shortcut {
  font-size: 12px;
  color: var(--app-text-muted);
}

.toolbar-text {
  font-size: 13px;
  color: var(--app-text);
  padding: 0 6px;
  width: 5.5em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
