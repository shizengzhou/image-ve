<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, onMounted, ref, watch } from 'vue';

import { LANGUAGES } from '@shared/i18n';
import type { CacheStats, LanguagePreference, ThemePreference } from '@shared/types';
import BaseAlert from '../components/base/BaseAlert.vue';
import BaseButton from '../components/base/BaseButton.vue';
import BaseSelect from '../components/base/BaseSelect.vue';
import TitleBar from '../components/TitleBar.vue';
import WindowControls from '../components/WindowControls.vue';
import { useAppSettings } from '../composables/useAppSettings';
import { useLanguagePreference } from '../composables/useLanguagePreference';
import { useThemePreference } from '../composables/useThemePreference';
import { formatBytes } from '../utils/formatter';
import { isLinux, isMac } from '../utils/platform';

const MIN_AUTOPLAY_INTERVAL = 0.1;
const MIN_WHEEL_ZOOM_STEP = 0.01;
const MAX_WHEEL_ZOOM_STEP = 1.0;

const { t } = useTranslation();
const isLoading = ref(false);
const cacheStats = ref<CacheStats | null>(null);
const errorMessage = ref('');

const { themePreference, setThemePreference } = useThemePreference();
const { languagePreference, setLanguagePreference } = useLanguagePreference();
const {
  recursiveSubdirectories,
  autoplayIntervalMs,
  wheelZoomStep,
  setRecursiveSubdirectories,
  setAutoplayIntervalMs,
  setWheelZoomStep,
  ensureSettingsLoaded
} = useAppSettings();

const autoplayIntervalSeconds = computed(() => Math.round(autoplayIntervalMs.value / 100) / 10);

const themeOptions = computed<{ value: ThemePreference; label: string }[]>(() => [
  { value: 'light', label: t('common.light') },
  { value: 'dark', label: t('common.dark') },
  { value: 'system', label: t('common.system') }
]);

const languageOptions = computed<{ value: LanguagePreference; label: string }[]>(() =>
  LANGUAGES.map((lang) => ({ value: lang.value, label: lang.name }))
);

const formattedSize = computed(() => formatBytes(cacheStats.value?.bytes ?? null));
const countText = computed(() =>
  cacheStats.value ? `${cacheStats.value.count} ${t('common.items')}` : '-'
);

const handleAutoplayIntervalChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = Number.parseFloat(target.value);
  if (Number.isNaN(value) || value < MIN_AUTOPLAY_INTERVAL) {
    target.value = String(autoplayIntervalSeconds.value);
    return;
  }
  setAutoplayIntervalMs(Math.round(value * 1000));
};

const handleWheelZoomStepChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  const value = Number.parseFloat(target.value);
  if (Number.isNaN(value) || value < MIN_WHEEL_ZOOM_STEP || value > MAX_WHEEL_ZOOM_STEP) {
    target.value = String(wheelZoomStep.value);
    return;
  }
  setWheelZoomStep(value);
};

const handleLanguageChange = (value: string | number): void => {
  const language = LANGUAGES.find((lang) => lang.value === value);
  void setLanguagePreference(language?.value ?? 'en');
};

const loadStats = async (): Promise<void> => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    cacheStats.value = await window.electron.getThumbnailCacheStats();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoading.value = false;
  }
};

const handleClear = async (): Promise<void> => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    cacheStats.value = await window.electron.clearThumbnailCache();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoading.value = false;
  }
};

const handleReveal = async (): Promise<void> => {
  if (!cacheStats.value?.path) {
    return;
  }
  try {
    await window.electron.revealInThumbnailCache(cacheStats.value.path);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  }
};

watch(
  () => t('settings.title'),
  (title) => {
    document.title = title;
  },
  { immediate: true }
);

onMounted(() => {
  void ensureSettingsLoaded();
  void loadStats();
});
</script>

<template>
  <div class="settings-shell">
    <TitleBar v-if="!isMac" :title="t('settings.title')">
      <template #right>
        <WindowControls only-close />
      </template>
    </TitleBar>
    <div class="settings-content">
      <BaseAlert v-if="errorMessage" :message="errorMessage" @close="errorMessage = ''" />

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">{{ t('settings.theme') }}</div>
        </div>
        <div class="setting-control">
          <div class="theme-options">
            <button
              v-for="option in themeOptions"
              :key="option.value"
              class="theme-button"
              :class="{ 'is-active': themePreference === option.value }"
              @click="setThemePreference(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">{{ t('settings.language') }}</div>
        </div>
        <div class="setting-control">
          <BaseSelect
            :model-value="languagePreference"
            :options="languageOptions"
            @change="handleLanguageChange"
          />
        </div>
      </div>

      <div class="settings-separator"></div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">{{ t('settings.recursiveSubdirectories') }}</div>
        </div>
        <div class="setting-control">
          <input
            type="checkbox"
            class="checkbox-control"
            :checked="recursiveSubdirectories"
            @change="setRecursiveSubdirectories(!recursiveSubdirectories)"
          />
        </div>
      </div>

      <div class="setting-item setting-item-input">
        <div class="setting-info">
          <div class="setting-label">{{ t('settings.autoplayInterval') }}</div>
        </div>
        <div class="setting-control setting-control-input">
          <div class="number-input-wrapper">
            <input
              type="number"
              class="number-input"
              :value="autoplayIntervalSeconds"
              min="0.1"
              step="0.1"
              @change="handleAutoplayIntervalChange"
            />
            <span class="number-unit">{{ t('settings.secondUnit') }}</span>
          </div>
          <div class="input-hint">{{ t('settings.autoplayIntervalHint') }}</div>
        </div>
      </div>

      <div class="setting-item setting-item-input">
        <div class="setting-info">
          <div class="setting-label">{{ t('settings.wheelZoomStep') }}</div>
        </div>
        <div class="setting-control setting-control-input">
          <div class="number-input-wrapper">
            <input
              type="number"
              class="number-input"
              :value="wheelZoomStep"
              min="0.01"
              max="1.0"
              step="0.01"
              @change="handleWheelZoomStepChange"
            />
          </div>
          <div class="input-hint">{{ t('settings.wheelZoomStepHint') }}</div>
        </div>
      </div>

      <div class="settings-separator"></div>

      <div class="setting-item setting-item-stack">
        <div class="setting-info">
          <div class="setting-label">{{ t('common.thumbnailCache') }}</div>
        </div>
        <div class="setting-control">
          <div class="cache-stats-row">
            <span>{{ formattedSize }}</span>
            <span class="desc-divider">·</span>
            <span>{{ countText }}</span>
          </div>
          <div class="button-group">
            <BaseButton :loading="isLoading" @click="handleClear">
              {{ t('common.clear') }}
            </BaseButton>
            <BaseButton :loading="isLoading" @click="handleReveal">
              {{
                isMac
                  ? t('common.showInFinder')
                  : isLinux
                    ? t('common.showInFileManager')
                    : t('common.showInExplorer')
              }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  width: 100%;
  height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
  display: flex;
  flex-direction: column;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px;
  width: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
}

.setting-item {
  display: grid;
  grid-template-columns: 180px 255px;
  align-items: center;
  padding: 6px 0;
  gap: 24px;
}

.setting-item-stack {
  align-items: flex-start;
}

.setting-info {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  min-width: 0;
}

.setting-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--app-text);
  height: 32px;
  display: flex;
  align-items: center;
  line-height: 1.2;
}

.setting-control {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.cache-stats-row {
  font-size: 13px;
  color: var(--app-text);
  height: 32px;
  display: flex;
  align-items: center;
}

.desc-divider {
  margin: 0 6px;
  opacity: 0.4;
}

.settings-separator {
  height: 1px;
  width: 100%;
  background: var(--panel-border);
  margin: 12px 0;
  flex-shrink: 0;
}

.setting-item-input {
  align-items: flex-start;
}

.setting-control-input {
  justify-content: flex-start;
  min-height: 28px;
}

.theme-options {
  display: flex;
  gap: 4px;
  padding: 3px;
  height: 28px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  box-sizing: border-box;
}

.theme-button {
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  transition: all 0.15s ease;
}

.theme-button:hover {
  color: var(--app-text);
}

.theme-button.is-active {
  background: var(--button-secondary-bg);
  color: var(--app-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.checkbox-control {
  width: 14px;
  height: 14px;
  margin: 0;
  accent-color: #4c8bf5;
}

.number-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.number-input {
  width: 64px;
  height: 28px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--app-text);
  font-size: 13px;
  font-weight: 500;
  outline: none;
  text-align: center;
  transition: border-color 0.15s ease;
}

.number-input:focus {
  border-color: var(--option-active-border);
}

.number-input::-webkit-inner-spin-button,
.number-input::-webkit-outer-spin-button {
  opacity: 1;
}

.number-unit {
  font-size: 12px;
  color: var(--app-text-muted);
}

.input-hint {
  font-size: 11px;
  color: var(--app-text-muted);
}

.button-group {
  display: flex;
  gap: 6px;
}
</style>
