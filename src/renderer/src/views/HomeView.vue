<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import type { ImageItem, SortKey, SortOrder } from '@shared/types';
import EmptyState from '../components/EmptyState.vue';
import MenuBar from '../components/MenuBar.vue';
import MetaPanel from '../components/MetaPanel.vue';
import ThumbnailSidebar from '../components/ThumbnailSidebar.vue';
import TitleBar from '../components/TitleBar.vue';
import ToolbarFooter from '../components/ToolbarFooter.vue';
import ViewerStage from '../components/ViewerStage.vue';
import WindowControls from '../components/WindowControls.vue';
import BaseLoading from '../components/base/BaseLoading.vue';
import { useAppSettings } from '../composables/useAppSettings';
import { useDirectoryWatch } from '../composables/useDirectoryWatch';
import { useDragDrop } from '../composables/useDragDrop';
import { useFileShortcuts } from '../composables/useFileShortcuts';
import { useImageLoader } from '../composables/useImageLoader';
import { useImageViewer } from '../composables/useImageViewer';
import { useLanguagePreference } from '../composables/useLanguagePreference';
import { useMenuListeners } from '../composables/useMenuListeners';
import { useRecentItems } from '../composables/useRecentItems';
import { useSettingsShortcut } from '../composables/useSettingsShortcut';
import { useThemePreference } from '../composables/useThemePreference';
import { isPermissionDenied } from '../utils/error';
import { formatBytes, formatCapturedAt, formatDate, normalizeExtension } from '../utils/formatter';
import { isMac } from '../utils/platform';

const PRODUCT_NAME = 'ImageVE';
const THUMBNAILS_VISIBLE_STORAGE_KEY = 'imagev-thumbnails-visible';

const { t } = useTranslation();
const imageItems = ref<ImageItem[]>([]);
const currentIndex = ref(0);
const isThumbnailsVisible = ref(true);

const storedThumbnailsVisible = localStorage.getItem(THUMBNAILS_VISIBLE_STORAGE_KEY);
if (storedThumbnailsVisible !== null) {
  isThumbnailsVisible.value =
    storedThumbnailsVisible === '1' || storedThumbnailsVisible.toLowerCase() === 'true';
}

watch(isThumbnailsVisible, (value) => {
  localStorage.setItem(THUMBNAILS_VISIBLE_STORAGE_KEY, value ? '1' : '0');
});

const {
  isLoading,
  statusMessage,
  lastLoadError,
  currentDirectory,
  isSoftRefreshing,
  extensionFilters,
  sortKey,
  sortOrder,
  availableExtensions,
  setExtensionFilters,
  setSort,
  pickImageFile,
  pickDirectory,
  openImageFile,
  openDirectory,
  loadThumbnail,
  setThumbnailVisibleRange,
  loadFromDirectory
} = useImageLoader(imageItems, currentIndex);

const { recentItems, loadRecentItems, clearRecentItems, removeRecentItem } = useRecentItems();
const { recursiveSubdirectories, autoplayIntervalMs } = useAppSettings();

const openPathInNewWindow = async (path: string, isDirectory: boolean): Promise<void> => {
  window.electron.openMainWindow(path, isDirectory);
};

const openWithAuthorization = async (path: string, isDirectory: boolean): Promise<void> => {
  const success = isDirectory ? await openDirectory(path) : await openImageFile(path);
  if (success || !isPermissionDenied(lastLoadError.value)) {
    return;
  }

  const selected = isDirectory ? await pickDirectory() : await pickImageFile();
  if (!selected) {
    return;
  }

  if (isDirectory) {
    await openDirectory(selected);
  } else {
    await openImageFile(selected);
  }
};

const handleSelectRecent = async (path: string, isDirectory: boolean): Promise<void> => {
  if (imageItems.value.length > 0) {
    await openPathInNewWindow(path, isDirectory);
    return;
  }
  await openWithAuthorization(path, isDirectory);
};

const handleClearRecent = async (): Promise<void> => {
  await clearRecentItems();
};

const handleRemoveRecent = async (path: string): Promise<void> => {
  await removeRecentItem(path);
};

const openMenuFile = async (): Promise<void> => {
  if (imageItems.value.length === 0) {
    await openImageFile();
    return;
  }
  const selected = await pickImageFile();
  if (!selected) {
    return;
  }
  await openPathInNewWindow(selected, false);
};

const openMenuDirectory = async (): Promise<void> => {
  if (imageItems.value.length === 0) {
    await openDirectory();
    return;
  }
  const selected = await pickDirectory();
  if (!selected) {
    return;
  }
  await openPathInNewWindow(selected, true);
};

const { register: registerDragDrop } = useDragDrop({
  imageItems,
  statusMessage,
  openImageFile,
  openDirectory
});

const {
  register: registerDirectoryWatch,
  updateWatch: updateDirectoryWatch,
  cleanup: cleanupDirectoryWatch
} = useDirectoryWatch({
  currentDirectory,
  recursiveSubdirectories,
  currentImagePath: computed(() => currentImage.value?.path),
  loadFromDirectory
});

const handleInitialOpen = async (): Promise<void> => {
  const params = new URLSearchParams(window.location.search);
  const openPath = params.get('openPath');
  if (!openPath) {
    return;
  }
  const isDir = params.get('openIsDir') === 'true' || params.get('openIsDir') === '1';
  await openWithAuthorization(openPath, isDir);
};

const unlisteners: Array<() => void> = [];

onMounted(async () => {
  void handleInitialOpen();
  void loadRecentItems(true);
  unlisteners.push(
    window.electron.onRecentItemsChanged(() => {
      void loadRecentItems(true);
    })
  );
  registerMenuListeners();
  unlisteners.push(registerDragDrop());
  unlisteners.push(registerDirectoryWatch());
  unlisteners.push(
    window.electron.onContextMenuCommand((command) => {
      if (command.type === 'sort') {
        handleSortChange(command.key, command.order);
      } else {
        handleFilterToggle(command.extension);
      }
    })
  );
});

onBeforeUnmount(() => {
  unregisterMenuListeners();
  unlisteners.forEach((unlisten) => unlisten());
  cleanupDirectoryWatch();
});

useSettingsShortcut();
useThemePreference();
useLanguagePreference();
if (!isMac) {
  useFileShortcuts({ openMenuFile, openMenuDirectory });
}

const {
  hasImages,
  currentImage,
  imageStyle,
  setImageStageRef,
  setCanvasRef,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  isPanning,
  canPanImage,
  isSearchOpen,
  searchQuery,
  searchHasResults,
  searchMatchCount,
  searchActiveIndex,
  searchActionId,
  setSearchQuery,
  performSearch,
  searchNext,
  searchPrev,
  closeSearch,
  openSearch,
  hasPrev,
  hasNext,
  zoomPercentage,
  pageIndicator,
  fileMetadata,
  selectIndex,
  showPrev,
  showNext,
  zoomOut,
  zoomIn,
  rotateRight,
  flipHorizontal,
  setFitMode,
  isInfoOpen,
  toggleInfoPanel,
  isPlaying,
  togglePlayback,
  handleImageLoad,
  isMainLoading,
  isMetadataLoading
} = useImageViewer(imageItems, currentIndex, { isSoftRefreshing, autoplayIntervalMs });

watch([currentDirectory, recursiveSubdirectories], () => {
  void updateDirectoryWatch();
});

watch(
  () => currentImage.value?.name,
  (name) => {
    document.title = name || PRODUCT_NAME;
  },
  { immediate: true }
);

const checkSearchFocus = (): void => {
  const input = document.querySelector<HTMLInputElement>('.search-box input');
  input?.focus();
  input?.select();
};

const handleToggleSearch = (): void => {
  if (!imageItems.value?.length) {
    return;
  }
  if (isSearchOpen.value) {
    checkSearchFocus();
  } else {
    openSearch();
  }
};

const toggleSearch = (): void => {
  handleToggleSearch();
};

const requestThumbnail = (index: number, maxSize?: number): void => {
  loadThumbnail(index, maxSize);
};

const updateThumbnailRange = (startIndex: number, endIndex: number): void => {
  setThumbnailVisibleRange(startIndex, endIndex);
};

const handleFilterToggle = (extension: string): void => {
  const normalized = normalizeExtension(extension);
  const next = new Set(extensionFilters.value.map(normalizeExtension));
  if (next.has(normalized)) {
    next.delete(normalized);
  } else {
    next.add(normalized);
  }
  void setExtensionFilters(Array.from(next));
};

const handleSortChange = (key: SortKey, order: SortOrder): void => {
  void setSort(key, order);
};

const handleContextMenu = (): void => {
  const imagePath = currentImage.value?.path;
  if (!imagePath) {
    return;
  }
  window.electron.showContextMenu({
    imagePath,
    filterOptions: Array.from(availableExtensions.value),
    activeFilters: Array.from(extensionFilters.value),
    sortKey: sortKey.value,
    sortOrder: sortOrder.value
  });
};

const { register: registerMenuListeners, unregister: unregisterMenuListeners } = useMenuListeners({
  imageItems,
  isThumbnailsVisible,
  isSearchOpen,
  pickImageFile,
  pickDirectory,
  openImageFile,
  openDirectory,
  openPathInNewWindow,
  openWithAuthorization,
  toggleSearch
});

const handleZoomIn = (): void => {
  if (!currentImage.value) {
    return;
  }
  let step = 0.1;
  if (currentImage.value.zoom) {
    if (Math.round(currentImage.value.zoom * 100) < 10) {
      step = 0.01;
    } else if (Math.round(currentImage.value.zoom * 100) >= 200) {
      step = currentImage.value.zoom * 0.1;
    }
  }
  zoomIn(step);
};

const handleZoomOut = (): void => {
  if (!currentImage.value) {
    return;
  }
  let step = 0.1;
  if (currentImage.value.zoom) {
    if (Math.round(currentImage.value.zoom * 100) <= 10) {
      step = 0.01;
    } else if (Math.round(currentImage.value.zoom * 100) > 200) {
      step = currentImage.value.zoom * 0.1;
    }
  }
  zoomOut(step);
};

const fileExtension = computed(() => {
  if (!currentImage.value) {
    return '-';
  }
  const parts = currentImage.value.name.split('.');
  if (parts.length < 2) {
    return '-';
  }
  const extension = parts[parts.length - 1];
  if (!extension) {
    return '-';
  }
  return extension.toUpperCase();
});

const dimensionText = computed(() => {
  const width = fileMetadata.value?.imageWidth;
  const height = fileMetadata.value?.imageHeight;
  if (!width || !height) {
    return '-';
  }
  return `${width} x ${height}`;
});

const formattedSize = computed(() => formatBytes(fileMetadata.value?.size ?? null));
const formattedModified = computed(() => formatDate(fileMetadata.value?.modified ?? null));
const formattedCreated = computed(() => formatDate(fileMetadata.value?.created ?? null));
const colorSpaceText = computed(() => fileMetadata.value?.colorSpace ?? null);
const colorProfileText = computed(() => fileMetadata.value?.colorProfile ?? null);
const deviceManufacturerText = computed(() => fileMetadata.value?.deviceManufacturer ?? null);
const deviceModelText = computed(() => fileMetadata.value?.deviceModel ?? null);
const lensModelText = computed(() => fileMetadata.value?.lensModel ?? null);
const capturedAtText = computed(() => formatCapturedAt(fileMetadata.value?.capturedAt));
const focalLengthText = computed(() => fileMetadata.value?.focalLength ?? null);
const isoSpeedText = computed(() => fileMetadata.value?.isoSpeed ?? null);
const flashText = computed(() => fileMetadata.value?.flash ?? null);
const apertureText = computed(() => fileMetadata.value?.aperture ?? null);
const meteringModeText = computed(() => fileMetadata.value?.meteringMode ?? null);
const whiteBalanceText = computed(() => fileMetadata.value?.whiteBalance ?? null);
const exposureModeText = computed(() => fileMetadata.value?.exposureMode ?? null);
const exposureBiasText = computed(() => fileMetadata.value?.exposureBias ?? null);
const exposureTimeText = computed(() => fileMetadata.value?.exposureTime ?? null);
const exposureProgramText = computed(() => fileMetadata.value?.exposureProgram ?? null);
const longitudeText = computed(() => fileMetadata.value?.longitude ?? null);
const latitudeText = computed(() => fileMetadata.value?.latitude ?? null);
const iptcDescriptionText = computed(() => fileMetadata.value?.iptcDescription ?? null);

const handleDismissStatus = (): void => {
  statusMessage.value = '';
};
</script>

<template>
  <div class="app-shell">
    <TitleBar :title="currentImage?.name">
      <template #left>
        <template v-if="isMac">
          <button
            v-if="hasImages"
            class="title-bar-icon-button"
            :aria-label="
              isThumbnailsVisible ? t('titlebar.hideThumbnails') : t('titlebar.showThumbnails')
            "
            @click="isThumbnailsVisible = !isThumbnailsVisible"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
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
        </template>
        <MenuBar
          v-else
          :is-thumbnails-visible="isThumbnailsVisible"
          :recent-items="recentItems"
          :has-images="hasImages"
          @toggle-thumbnails="isThumbnailsVisible = !isThumbnailsVisible"
          @open-file="openMenuFile"
          @open-directory="openMenuDirectory"
          @select-recent="handleSelectRecent"
          @clear-recent="handleClearRecent"
          @toggle-search="handleToggleSearch"
        />
      </template>
      <template #right>
        <WindowControls v-if="!isMac" />
      </template>
    </TitleBar>
    <div class="content">
      <template v-if="hasImages">
        <ThumbnailSidebar
          v-if="isThumbnailsVisible"
          :items="imageItems"
          :current-index="currentIndex"
          :search-action-id="searchActionId"
          @select="selectIndex"
          @request-thumbnail="requestThumbnail"
          @visible-range="updateThumbnailRange"
        />
        <ViewerStage
          :current-image="currentImage"
          :image-style="imageStyle"
          :status-message="statusMessage"
          :set-image-stage-ref="setImageStageRef"
          :set-canvas-ref="setCanvasRef"
          :on-load="handleImageLoad"
          :on-pointer-down="handlePointerDown"
          :on-pointer-move="handlePointerMove"
          :on-pointer-up="handlePointerUp"
          :on-wheel="handleWheel"
          :is-panning="isPanning"
          :can-pan="canPanImage"
          :info-panel-open="isInfoOpen"
          :search-open="isSearchOpen"
          :search-value="searchQuery"
          :search-has-results="searchHasResults"
          :search-match-count="searchMatchCount"
          :search-active-index="searchActiveIndex"
          :on-search-input="setSearchQuery"
          :on-search-submit="performSearch"
          :on-search-next="searchNext"
          :on-search-prev="searchPrev"
          :on-search-close="closeSearch"
          :has-prev="hasPrev"
          :has-next="hasNext"
          :is-loading="isMainLoading"
          :is-app-loading="isLoading"
          @prev="showPrev"
          @next="showNext"
          @context-menu="handleContextMenu"
          @dismiss-status="handleDismissStatus"
        />
        <MetaPanel
          v-if="isInfoOpen && currentImage"
          :current-image="currentImage"
          :file-extension="fileExtension"
          :formatted-size="formattedSize"
          :formatted-modified="formattedModified"
          :formatted-created="formattedCreated"
          :dimension-text="dimensionText"
          :color-space="colorSpaceText"
          :color-profile="colorProfileText"
          :device-manufacturer="deviceManufacturerText"
          :device-model="deviceModelText"
          :lens-model="lensModelText"
          :captured-at="capturedAtText"
          :focal-length="focalLengthText"
          :iso-speed="isoSpeedText"
          :flash="flashText"
          :aperture="apertureText"
          :metering-mode="meteringModeText"
          :white-balance="whiteBalanceText"
          :exposure-mode="exposureModeText"
          :exposure-bias="exposureBiasText"
          :exposure-time="exposureTimeText"
          :exposure-program="exposureProgramText"
          :longitude="longitudeText"
          :latitude="latitudeText"
          :iptc-description="iptcDescriptionText"
          :loading="isMetadataLoading"
        />
        <ToolbarFooter
          :zoom-percentage="zoomPercentage"
          :page-indicator="pageIndicator"
          :is-playing="isPlaying"
          :is-info-open="isInfoOpen"
          @prev="showPrev"
          @next="showNext"
          @zoom-out="handleZoomOut"
          @zoom-in="handleZoomIn"
          @rotate-right="rotateRight"
          @flip-horizontal="flipHorizontal"
          @fit-window="setFitMode('window')"
          @fit-actual="setFitMode('actual')"
          @toggle-info="toggleInfoPanel"
          @play="togglePlayback"
        />
      </template>
      <EmptyState
        v-if="!hasImages"
        :status-message="statusMessage"
        :recent-items="recentItems"
        @open-image="openImageFile"
        @open-directory="openDirectory"
        @select-recent="handleSelectRecent"
        @clear-recent="handleClearRecent"
        @remove-recent="handleRemoveRecent"
      />
      <BaseLoading v-if="isLoading" overlay size="48" />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--app-bg);
  color: var(--app-text);
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.title-bar-icon-button {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--app-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: all 0.15s ease;
  pointer-events: auto;
  -webkit-app-region: no-drag;
  app-region: no-drag;
}

.title-bar-icon-button:hover {
  background: var(--button-secondary-hover);
  color: var(--app-text);
}
</style>
