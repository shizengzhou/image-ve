<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { RecentItem } from '@shared/types';
import { getFileName } from '../utils/formatter';
import BaseButton from './base/BaseButton.vue';
import IconClose from './icons/IconClose.vue';

defineProps<{
  items: RecentItem[];
}>();

const emit = defineEmits<{
  (event: 'select', path: string, isDirectory: boolean): void;
  (event: 'clear'): void;
  (event: 'remove', path: string): void;
}>();

const { t } = useTranslation();
</script>

<template>
  <div v-if="items.length > 0" class="recent-items">
    <div class="recent-header">
      <div class="recent-title">{{ t('empty.recentTitle') }}</div>
      <BaseButton size="sm" @click="emit('clear')">
        {{ t('empty.clearRecent') }}
      </BaseButton>
    </div>
    <div class="recent-grid">
      <div v-for="item in items" :key="item.path" class="recent-item-wrapper">
        <button class="recent-item" @click="emit('select', item.path, item.isDirectory)">
          <div class="recent-thumbnail">
            <div v-if="item.isDirectory" class="folder-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <img
              v-else
              :src="item.thumbnail"
              :alt="getFileName(item.path)"
              class="thumbnail-image"
              draggable="false"
            />
          </div>
          <div class="recent-name" :title="getFileName(item.path)">
            {{ getFileName(item.path) }}
          </div>
        </button>
        <button
          class="remove-button"
          :title="t('empty.removeRecent')"
          @click.stop="emit('remove', item.path)"
        >
          <IconClose />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-items {
  width: 100%;
  max-width: 960px;
  padding: 16px 18px 20px;
  border-radius: 16px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  box-shadow: 0 10px 30px rgba(8, 10, 12, 0.08);
}

.recent-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--app-text-muted);
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.recent-grid {
  overflow-x: auto;
  padding-bottom: 8px;
  display: flex;
  flex-wrap: nowrap;
  gap: 14px;
}

.recent-grid::-webkit-scrollbar {
  display: none;
}

.recent-item-wrapper {
  position: relative;
  flex-shrink: 0;
}

.recent-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 4px 0 0;
  background: transparent;
  border: none;
  transition: color 0.2s ease;
}

.recent-item-wrapper:hover .recent-thumbnail {
  border-color: var(--option-active-border);
  box-shadow: 0 8px 18px rgba(8, 10, 12, 0.18);
  transform: translateY(-1px);
}

.recent-item:focus-visible .recent-thumbnail {
  outline: 2px solid var(--option-active-border);
  outline-offset: 2px;
}

.remove-button {
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 50%;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  color: var(--app-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 10;
  transition:
    opacity 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.recent-item-wrapper:hover .remove-button {
  opacity: 1;
}

.remove-button:hover {
  background: #ff4d4f;
  border-color: #ff4d4f;
  color: white;
}

.remove-button svg {
  width: 12px;
  height: 12px;
}

.recent-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--button-secondary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--panel-border);
  box-shadow: 0 2px 10px rgba(8, 10, 12, 0.08);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.folder-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--button-secondary-bg);
  color: var(--app-text);
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-icon svg {
  width: 38px;
  height: 38px;
}

.recent-name {
  font-size: 11px;
  color: var(--app-text);
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}
</style>
