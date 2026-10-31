<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

import type { RecentItem } from '@shared/types';

defineProps<{
  isThumbnailsVisible?: boolean;
  recentItems?: RecentItem[];
  hasImages: boolean;
}>();

const emit = defineEmits<{
  toggleThumbnails: [];
  openFile: [];
  openDirectory: [];
  selectRecent: [path: string, isDirectory: boolean];
  clearRecent: [];
  toggleSearch: [];
}>();

const { t } = useTranslation();
const isOpen = ref(false);
const isRecentOpen = ref(false);
let recentCloseTimer: ReturnType<typeof setTimeout> | null = null;

const clearRecentCloseTimer = (): void => {
  if (recentCloseTimer) {
    clearTimeout(recentCloseTimer);
    recentCloseTimer = null;
  }
};

const toggleMenu = (): void => {
  isOpen.value = !isOpen.value;
  isRecentOpen.value = false;
};

const closeMenu = (): void => {
  isOpen.value = false;
  isRecentOpen.value = false;
  clearRecentCloseTimer();
};

const openRecent = (): void => {
  clearRecentCloseTimer();
  isRecentOpen.value = true;
};

const scheduleCloseRecent = (): void => {
  clearRecentCloseTimer();
  recentCloseTimer = setTimeout(() => {
    isRecentOpen.value = false;
  }, 120);
};

const handleWindowClick = (event: MouseEvent): void => {
  const target = event.target as Node;
  const menuBar = document.querySelector('.menu-bar');
  if (menuBar && !menuBar.contains(target)) {
    closeMenu();
  }
};

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    closeMenu();
  }
};

onMounted(() => {
  window.addEventListener('click', handleWindowClick);
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  clearRecentCloseTimer();
  window.removeEventListener('click', handleWindowClick);
  window.removeEventListener('keydown', handleKeydown);
});

const handleOpenFile = (): void => {
  emit('openFile');
  closeMenu();
};

const handleOpenDirectory = (): void => {
  emit('openDirectory');
  closeMenu();
};

const handleOpenSettings = (): void => {
  window.electron.openSettingsWindow();
  closeMenu();
};

const handleSelectRecent = (path: string, isDirectory: boolean): void => {
  emit('selectRecent', path, isDirectory);
  closeMenu();
};

const handleClearRecent = (): void => {
  emit('clearRecent');
  closeMenu();
};

const handleQuit = (): void => {
  window.electron.quitApp();
  closeMenu();
};

const handleSearch = (): void => {
  emit('toggleSearch');
  closeMenu();
};

const handleAbout = async (): Promise<void> => {
  closeMenu();
  const metadata = await window.electron.getAppMetadata();
  await window.electron.showMessageBox(
    `${metadata.name}\n${t('common.version')}: ${metadata.version}`,
    metadata.name
  );
};

const handleFeedback = (): void => {
  void window.electron.openExternal('https://github.com/shizengzhou/image-v-feedback/issues');
  closeMenu();
};

const handleToggleThumbnails = (): void => {
  emit('toggleThumbnails');
  closeMenu();
};
</script>

<template>
  <div class="menu-bar">
    <button
      type="button"
      class="hamburger-button"
      :aria-label="t('menu.title')"
      :aria-expanded="isOpen"
      @click.stop="toggleMenu"
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
        <line x1="2" y1="3" x2="16" y2="3" stroke="currentColor" stroke-width="1.5" />
        <line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="1.5" />
        <line x1="2" y1="11" x2="16" y2="11" stroke="currentColor" stroke-width="1.5" />
      </svg>
    </button>

    <button
      v-if="hasImages && isThumbnailsVisible !== undefined"
      type="button"
      class="hamburger-button thumbnail-toggle-button"
      :aria-label="
        isThumbnailsVisible ? t('titlebar.hideThumbnails') : t('titlebar.showThumbnails')
      "
      :title="isThumbnailsVisible ? t('titlebar.hideThumbnails') : t('titlebar.showThumbnails')"
      @click.stop="handleToggleThumbnails"
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
        <rect
          x="0.75"
          y="0.75"
          width="16.5"
          height="12.5"
          rx="1.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <line
          x1="5.5"
          y1="1.5"
          x2="5.5"
          y2="12.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <line
          x1="2"
          y1="4"
          x2="4.5"
          y2="4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <line
          x1="2"
          y1="7"
          x2="4.5"
          y2="7"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <line
          x1="2"
          y1="10"
          x2="4.5"
          y2="10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <div v-if="isOpen" class="hamburger-dropdown">
      <div class="menu-item" @click="handleOpenFile">
        <span>{{ t('empty.openFile') }}</span>
        <span class="menu-shortcut">Ctrl+O</span>
      </div>
      <div class="menu-item" @click="handleOpenDirectory">
        <span>{{ t('empty.openDirectory') }}</span>
        <span class="menu-shortcut">Ctrl+Shift+O</span>
      </div>
      <div
        v-if="recentItems && recentItems.length > 0"
        class="menu-submenu-container"
        @mouseenter="openRecent"
        @mouseleave="scheduleCloseRecent"
      >
        <div class="menu-item menu-has-submenu" @click.stop="isRecentOpen = !isRecentOpen">
          <span>{{ t('menu.openRecent') }}</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4.5 2.5L8 6L4.5 9.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div v-if="isRecentOpen" class="menu-submenu">
          <div
            v-for="item in recentItems"
            :key="item.path"
            class="menu-item menu-recent"
            :title="item.path"
            @click="handleSelectRecent(item.path, item.isDirectory)"
          >
            {{ item.path.split(/[\\/]/).pop() || item.path }}
          </div>
          <div class="menu-divider" />
          <div class="menu-item" @click="handleClearRecent">
            {{ t('empty.clearRecent') }}
          </div>
        </div>
      </div>
      <div class="menu-divider" />
      <div class="menu-item" @click="handleSearch">
        <span>{{ t('menu.search') }}</span>
        <span class="menu-shortcut">Ctrl+F</span>
      </div>
      <div class="menu-divider" />
      <div class="menu-item" @click="handleOpenSettings">
        <span>{{ t('settings.title') }}</span>
        <span class="menu-shortcut">Ctrl+,</span>
      </div>
      <div class="menu-item" @click="handleFeedback">
        {{ t('menu.feedback') }}
      </div>
      <div class="menu-item" @click="handleAbout">
        {{ t('menu.about') }}
      </div>
      <div class="menu-divider" />
      <div class="menu-item" @click="handleQuit">
        {{ t('menu.quit') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.hamburger-button {
  width: 30px;
  height: 26px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text);
  cursor: default;
  transition: background 0.15s ease;
}

.hamburger-button:hover,
.hamburger-button[aria-expanded='true'] {
  background: var(--button-secondary-hover);
}

.hamburger-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 210px;
  max-width: 320px;
  background: var(--app-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 30px;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.15s ease;
  cursor: default;
}

.menu-item:hover {
  background: var(--button-secondary-hover);
}

.menu-shortcut {
  margin-left: 16px;
  font-size: 12px;
  color: var(--app-text-muted);
  opacity: 0.7;
}

.menu-divider {
  height: 1px;
  background: var(--panel-border);
  margin: 4px 6px;
}

.menu-submenu-container {
  position: relative;
}

.menu-has-submenu svg {
  flex-shrink: 0;
  margin-left: 8px;
  opacity: 0.6;
}

.menu-submenu {
  position: absolute;
  top: -6px;
  left: calc(100% + 4px);
  min-width: 240px;
  max-width: 360px;
  max-height: 400px;
  overflow-y: auto;
  background: var(--app-bg);
  border: 1px solid var(--panel-border);
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.menu-submenu .menu-item {
  font-size: 12px;
}
</style>
