<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { ref, watch } from 'vue';

import type { ImageItem } from '@shared/types';

const props = defineProps<{
  currentImage: ImageItem;
  fileExtension: string;
  formattedSize: string;
  formattedModified: string;
  formattedCreated: string;
  dimensionText: string;
  colorSpace: string | null | undefined;
  colorProfile: string | null | undefined;
  deviceManufacturer: string | null | undefined;
  deviceModel: string | null | undefined;
  lensModel: string | null | undefined;
  capturedAt: string | null | undefined;
  focalLength: string | null | undefined;
  isoSpeed: string | null | undefined;
  flash: string | null | undefined;
  aperture: string | null | undefined;
  meteringMode: string | null | undefined;
  whiteBalance: string | null | undefined;
  exposureMode: string | null | undefined;
  exposureBias: string | null | undefined;
  exposureTime: string | null | undefined;
  exposureProgram: string | null | undefined;
  longitude: string | null | undefined;
  latitude: string | null | undefined;
  iptcDescription: string | null | undefined;
  loading?: boolean;
}>();

const { t } = useTranslation();

const showSkeleton = ref(false);
let skeletonTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.loading,
  (loading) => {
    if (loading) {
      skeletonTimer = setTimeout(() => {
        if (props.loading) {
          showSkeleton.value = true;
        }
      }, 150);
    } else {
      if (skeletonTimer) {
        clearTimeout(skeletonTimer);
        skeletonTimer = null;
      }
      showSkeleton.value = false;
    }
  },
  { immediate: true }
);
</script>

<template>
  <aside class="meta-panel">
    <div class="meta-scroll">
      <div class="meta-stack">
        <div class="meta-section">
          <div class="meta-row">
            <div class="meta-label">{{ t('meta.fileName') }}</div>
            <div class="meta-value">{{ currentImage.name }}</div>
          </div>
          <div class="meta-row">
            <div class="meta-label">{{ t('meta.filePath') }}</div>
            <div class="meta-value">{{ currentImage.path }}</div>
          </div>
          <div class="meta-row">
            <div class="meta-label">{{ t('meta.type') }}</div>
            <div class="meta-value">{{ fileExtension }}</div>
          </div>
          <div v-if="showSkeleton || formattedSize" class="meta-row">
            <div class="meta-label">{{ t('meta.size') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w4"></span>
              <template v-else>{{ formattedSize }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || dimensionText" class="meta-row">
            <div class="meta-label">{{ t('meta.dimension') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ dimensionText }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || formattedCreated" class="meta-row">
            <div class="meta-label">{{ t('meta.createdAt') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w6"></span>
              <template v-else>{{ formattedCreated }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || formattedModified" class="meta-row">
            <div class="meta-label">{{ t('meta.modifiedAt') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w6"></span>
              <template v-else>{{ formattedModified }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || capturedAt" class="meta-row">
            <div class="meta-label">{{ t('meta.capturedAt') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w6"></span>
              <template v-else>{{ capturedAt }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || colorSpace" class="meta-row">
            <div class="meta-label">{{ t('meta.colorSpace') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w4"></span>
              <template v-else>{{ colorSpace }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || colorProfile" class="meta-row">
            <div class="meta-label">{{ t('meta.colorProfile') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w7"></span>
              <template v-else>{{ colorProfile }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || deviceManufacturer" class="meta-row">
            <div class="meta-label">{{ t('meta.deviceManufacturer') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ deviceManufacturer }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || deviceModel" class="meta-row">
            <div class="meta-label">{{ t('meta.deviceModel') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ deviceModel }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || lensModel" class="meta-row">
            <div class="meta-label">{{ t('meta.lensModel') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w8"></span>
              <template v-else>{{ lensModel }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || focalLength" class="meta-row">
            <div class="meta-label">{{ t('meta.focalLength') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w3"></span>
              <template v-else>{{ focalLength }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || isoSpeed" class="meta-row">
            <div class="meta-label">{{ t('meta.isoSpeed') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w3"></span>
              <template v-else>{{ isoSpeed }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || flash" class="meta-row">
            <div class="meta-label">{{ t('meta.flash') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ flash }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || aperture" class="meta-row">
            <div class="meta-label">{{ t('meta.aperture') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w3"></span>
              <template v-else>{{ aperture }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || meteringMode" class="meta-row">
            <div class="meta-label">{{ t('meta.meteringMode') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ meteringMode }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || whiteBalance" class="meta-row">
            <div class="meta-label">{{ t('meta.whiteBalance') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w4"></span>
              <template v-else>{{ whiteBalance }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || exposureMode" class="meta-row">
            <div class="meta-label">{{ t('meta.exposureMode') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ exposureMode }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || exposureBias" class="meta-row">
            <div class="meta-label">{{ t('meta.exposureBias') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w3"></span>
              <template v-else>{{ exposureBias }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || exposureTime" class="meta-row">
            <div class="meta-label">{{ t('meta.exposureTime') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w3"></span>
              <template v-else>{{ exposureTime }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || exposureProgram" class="meta-row">
            <div class="meta-label">{{ t('meta.exposureProgram') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w5"></span>
              <template v-else>{{ exposureProgram }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || longitude" class="meta-row">
            <div class="meta-label">{{ t('meta.longitude') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w6"></span>
              <template v-else>{{ longitude }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || latitude" class="meta-row">
            <div class="meta-label">{{ t('meta.latitude') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w6"></span>
              <template v-else>{{ latitude }}</template>
            </div>
          </div>
          <div v-if="showSkeleton || iptcDescription" class="meta-row">
            <div class="meta-label">{{ t('meta.iptcDescription') }}</div>
            <div class="meta-value">
              <span v-if="showSkeleton" class="skeleton-bar skeleton-w9"></span>
              <template v-else>{{ iptcDescription }}</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.meta-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 280px;
  height: 100%;
  background: var(--panel-bg-transparent);
  border-left: 1px solid var(--panel-border);
  padding: 12px 18px 24px;
  z-index: 3;
}

.meta-scroll {
  height: 100%;
  overflow-y: auto;
}

.meta-scroll::-webkit-scrollbar {
  display: none;
}

.meta-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meta-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-label {
  font-size: 12px;
  color: var(--app-text-subtle);
}

.meta-value {
  font-size: 12px;
  color: var(--app-text);
  word-break: break-all;
}

.skeleton-bar {
  display: inline-block;
  height: 12px;
  border-radius: 3px;
  background: linear-gradient(
    90deg,
    var(--app-text-subtle) 25%,
    var(--app-text-muted) 50%,
    var(--app-text-subtle) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s infinite linear;
}

.skeleton-w3 {
  width: 30%;
}
.skeleton-w4 {
  width: 40%;
}
.skeleton-w5 {
  width: 50%;
}
.skeleton-w6 {
  width: 60%;
}
.skeleton-w7 {
  width: 70%;
}
.skeleton-w8 {
  width: 80%;
}
.skeleton-w9 {
  width: 90%;
}

@keyframes skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
