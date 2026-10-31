import { type Ref } from 'vue';

import type { ImageItem, OpenPathPayload } from '@shared/types';

export interface MenuListenersOptions {
  imageItems: Ref<ImageItem[]>;
  isThumbnailsVisible: Ref<boolean>;
  isSearchOpen: Ref<boolean>;
  pickImageFile: () => Promise<string | null>;
  pickDirectory: () => Promise<string | null>;
  openImageFile: (path?: string) => Promise<boolean>;
  openDirectory: (path?: string) => Promise<boolean>;
  openPathInNewWindow: (path: string, isDirectory: boolean) => Promise<void>;
  openWithAuthorization: (path: string, isDirectory: boolean) => Promise<void>;
  toggleSearch: () => void;
}

export const useMenuListeners = (options: MenuListenersOptions) => {
  const unlisteners: Array<() => void> = [];

  const openMenuFile = async (): Promise<void> => {
    if (options.imageItems.value.length === 0) {
      await options.openImageFile();
      return;
    }
    const selected = await options.pickImageFile();
    if (!selected) {
      return;
    }
    await options.openPathInNewWindow(selected, false);
  };

  const openMenuDirectory = async (): Promise<void> => {
    if (options.imageItems.value.length === 0) {
      await options.openDirectory();
      return;
    }
    const selected = await options.pickDirectory();
    if (!selected) {
      return;
    }
    await options.openPathInNewWindow(selected, true);
  };

  const register = (): void => {
    unlisteners.push(
      window.electron.onMenuOpenFile(() => {
        void openMenuFile();
      })
    );

    unlisteners.push(
      window.electron.onMenuOpenDirectory(() => {
        void openMenuDirectory();
      })
    );

    unlisteners.push(
      window.electron.onMenuToggleThumbnails(() => {
        if (!options.imageItems.value.length) {
          return;
        }
        options.isThumbnailsVisible.value = !options.isThumbnailsVisible.value;
      })
    );

    unlisteners.push(
      window.electron.onMenuSearch(() => {
        if (!options.imageItems.value.length) {
          return;
        }
        options.toggleSearch();
      })
    );

    unlisteners.push(
      window.electron.onAppOpenPath((payload: OpenPathPayload) => {
        if (options.imageItems.value.length > 0) {
          void options.openPathInNewWindow(payload.path, payload.isDirectory);
        } else {
          void options.openWithAuthorization(payload.path, payload.isDirectory);
        }
      })
    );
  };

  const unregister = (): void => {
    unlisteners.forEach((unlisten) => unlisten());
    unlisteners.length = 0;
  };

  return {
    register,
    unregister
  };
};
