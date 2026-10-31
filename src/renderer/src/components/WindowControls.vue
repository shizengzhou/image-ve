<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps<{ onlyClose?: boolean }>();

const { t } = useTranslation();
const isMaximized = ref(false);
let unsubscribe: (() => void) | undefined;

const minimize = (): void => {
  window.electron.windowMinimize();
};

const toggleMaximize = (): void => {
  window.electron.windowToggleMaximize();
};

const close = (): void => {
  window.electron.windowClose();
};

onMounted(async () => {
  isMaximized.value = await window.electron.windowIsMaximized();
  unsubscribe = window.electron.onWindowMaximizedChanged((value) => {
    isMaximized.value = value;
  });
});

onBeforeUnmount(() => {
  unsubscribe?.();
});
</script>

<template>
  <div class="title-bar-controls">
    <template v-if="!onlyClose">
      <button class="title-bar-button" :aria-label="t('titlebar.minimize')" @click="minimize">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect x="0" y="4" width="10" height="2" fill="currentColor" />
        </svg>
      </button>
      <button class="title-bar-button" :aria-label="t('titlebar.maximize')" @click="toggleMaximize">
        <svg
          v-if="isMaximized"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="miter">
            <rect x="3.8" y="5.8" width="7.4" height="7.4" />
            <path d="M5.5 5.5V4H13V11.5H11.5" />
          </g>
        </svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10">
          <rect
            x="0.75"
            y="0.75"
            width="8.5"
            height="8.5"
            stroke="currentColor"
            stroke-width="1.5"
            fill="none"
          />
        </svg>
      </button>
    </template>
    <button
      class="title-bar-button title-bar-close"
      :aria-label="t('titlebar.close')"
      @click="close"
    >
      <svg width="10" height="10" viewBox="0 0 10 10">
        <path
          d="M1 1L9 9M9 1L1 9"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
  </div>
</template>

<style>
.title-bar-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.title-bar-button {
  width: 46px;
  height: 32px;
  border-radius: 0;
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.15s ease;
  pointer-events: auto;
}

.title-bar-button:hover {
  background: var(--button-secondary-hover);
  color: var(--app-text);
}

.title-bar-close:hover {
  background: #ff5f57;
  color: white;
}
</style>
