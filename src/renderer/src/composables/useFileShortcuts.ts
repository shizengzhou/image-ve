import { onBeforeUnmount, onMounted } from 'vue';

import { isMac } from '../utils/platform';

export interface FileShortcutsOptions {
  openMenuFile: () => Promise<void>;
  openMenuDirectory: () => Promise<void>;
}

export const useFileShortcuts = (options: FileShortcutsOptions) => {
  const handleKeydown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    const hasModifier = isMac ? event.metaKey : event.ctrlKey;
    if (!hasModifier) {
      return;
    }

    if (event.key === 'o' && !event.shiftKey) {
      event.preventDefault();
      void options.openMenuFile();
    }

    if (event.key === 'O' && event.shiftKey) {
      event.preventDefault();
      void options.openMenuDirectory();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
};
