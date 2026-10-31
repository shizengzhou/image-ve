import { onBeforeUnmount, onMounted } from 'vue';

import { isMac } from '../utils/platform';

const openSettingsWindow = (): void => {
  window.electron.openSettingsWindow();
};

export const useSettingsShortcut = () => {
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

    if (event.key === ',') {
      event.preventDefault();
      openSettingsWindow();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
};
