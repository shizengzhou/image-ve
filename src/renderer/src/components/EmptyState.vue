<script setup lang="ts">
import { useTranslation } from 'i18next-vue';

import type { RecentItem } from '@shared/types';
import BaseButton from './base/BaseButton.vue';
import RecentItems from './RecentItems.vue';

defineProps<{
  statusMessage: string;
  recentItems?: RecentItem[];
}>();

const emit = defineEmits<{
  (event: 'openImage'): void;
  (event: 'openDirectory'): void;
  (event: 'selectRecent', path: string, isDirectory: boolean): void;
  (event: 'clearRecent'): void;
  (event: 'removeRecent', path: string): void;
}>();

const { t } = useTranslation();
</script>

<template>
  <div class="empty-state">
    <div class="empty-state-wrapper">
      <div class="empty-state-content">
        <img src="../assets/128x128@2x.png" alt="" class="empty-icon" draggable="false" />
        <div class="empty-title">{{ t('empty.title') }}</div>
        <div class="empty-subtitle">{{ t('empty.subtitle') }}</div>
        <div class="empty-actions">
          <BaseButton variant="primary" size="lg" @click="emit('openImage')">
            {{ t('empty.openFile') }}
          </BaseButton>
          <BaseButton variant="secondary" size="lg" @click="emit('openDirectory')">
            {{ t('empty.openDirectory') }}
          </BaseButton>
        </div>
        <div v-if="statusMessage" class="status-text">{{ statusMessage }}</div>
      </div>
      <RecentItems
        v-if="recentItems && recentItems.length > 0"
        :items="recentItems"
        @select="(path, isDir) => emit('selectRecent', path, isDir)"
        @clear="emit('clearRecent')"
        @remove="(path) => emit('removeRecent', path)"
      />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow-y: auto;
}

.empty-state-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 100%;
  padding: 48px 24px;
  gap: 48px;
}

.empty-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 520px;
  flex: 1;
  justify-content: center;
}

.empty-icon {
  width: 120px;
  height: 120px;
  object-fit: contain;
}

.empty-title {
  font-size: 24px;
  font-weight: 600;
}

.empty-subtitle {
  font-size: 14px;
  color: var(--app-text-muted);
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  gap: 16px;
  margin-top: 8px;
}

.status-text {
  font-size: 13px;
  color: var(--app-text-subtle);
}
</style>
