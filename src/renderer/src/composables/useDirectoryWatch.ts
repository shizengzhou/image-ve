import type { Ref } from 'vue';

export interface DirectoryWatchOptions {
  currentDirectory: Ref<string | null>;
  recursiveSubdirectories: Ref<boolean>;
  currentImagePath: Ref<string | undefined>;
  loadFromDirectory: (
    directory: string,
    targetPath?: string,
    options?: { refresh?: boolean }
  ) => Promise<boolean>;
}

export const useDirectoryWatch = (options: DirectoryWatchOptions) => {
  let refreshTimer: number | null = null;

  const register = (): (() => void) => {
    return window.electron.onDirectoryChanged((payload) => {
      const activeDirectory = options.currentDirectory.value;
      if (!activeDirectory || payload.path !== activeDirectory) {
        return;
      }

      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }

      refreshTimer = window.setTimeout(() => {
        const directory = options.currentDirectory.value;
        if (!directory) {
          return;
        }
        void options.loadFromDirectory(directory, options.currentImagePath.value, {
          refresh: true
        });
      }, 200);
    });
  };

  const updateWatch = async (): Promise<void> => {
    const directory = options.currentDirectory.value;
    if (!directory) {
      await window.electron.unwatchDirectory();
      return;
    }
    await window.electron.watchDirectory(directory, options.recursiveSubdirectories.value);
  };

  const cleanup = (): void => {
    if (refreshTimer) {
      window.clearTimeout(refreshTimer);
    }
    void window.electron.unwatchDirectory();
  };

  return {
    register,
    updateWatch,
    cleanup
  };
};
