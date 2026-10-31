<script setup lang="ts">
import { useTranslation } from 'i18next-vue';
import { computed } from 'vue';

import BaseButton from './base/BaseButton.vue';
import IconNext from './icons/IconNext.vue';
import IconPrev from './icons/IconPrev.vue';

const props = defineProps<{
  open: boolean;
  value: string;
  hasResults: boolean;
  resultTotal: number | null;
  resultIndex: number | null;
  infoPanelOpen?: boolean;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}>();

const { t } = useTranslation();
const resultText = computed(() => {
  if (props.resultTotal === null) {
    return '';
  }
  if (props.value.trim().length === 0) {
    return '';
  }
  if (props.resultTotal <= 0) {
    return '0/0';
  }
  const index = Math.min(Math.max(props.resultIndex ?? 0, 0), props.resultTotal - 1);
  return `${index + 1}/${props.resultTotal}`;
});

const vFocus = {
  mounted: (el: HTMLInputElement): void => el.focus()
};

const vSelect = {
  mounted: (el: HTMLInputElement): void => el.select()
};
</script>

<template>
  <div v-if="open" class="search-box" :class="{ 'info-panel-open': infoPanelOpen }">
    <div class="search-field">
      <span class="search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" />
          <path
            d="M20 20L16.6 16.6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>
      <input
        v-focus
        v-select
        class="search-input"
        type="text"
        :value="value"
        :placeholder="t('viewer.searchPlaceholder')"
        :aria-label="t('viewer.searchPlaceholder')"
        autocomplete="off"
        autocorrect="off"
        @input="(event) => onInput((event.target as HTMLInputElement).value)"
        @keydown.enter.prevent="onSubmit"
        @keydown.escape.prevent="onClose"
        @keydown="
          (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') e.preventDefault();
          }
        "
      />
      <span class="search-count">{{ resultText }}</span>
    </div>
    <div class="search-actions">
      <BaseButton
        class="search-nav-button"
        size="sm"
        icon-only
        :disabled="!hasResults"
        :aria-label="t('viewer.searchPrev')"
        @click="onPrev"
      >
        <IconPrev class="nav-icon" />
      </BaseButton>
      <BaseButton
        class="search-nav-button"
        size="sm"
        icon-only
        :disabled="!hasResults"
        :aria-label="t('viewer.searchNext')"
        @click="onNext"
      >
        <IconNext class="nav-icon" />
      </BaseButton>
      <BaseButton
        class="search-close-button"
        size="sm"
        icon-only
        :aria-label="t('viewer.searchClose')"
        @click="onClose"
      >
        <svg viewBox="0 0 24 24" fill="none" class="nav-icon">
          <path
            d="M18 6L6 18M6 6L18 18"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.search-box {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20;
  padding: 6px;
  border-radius: 12px;
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  box-shadow: 0 10px 24px rgba(8, 10, 12, 0.18);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.search-box.info-panel-open {
  right: 296px;
}

.search-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  background: var(--button-secondary-bg);
  border: 1px solid var(--button-secondary-border);
  width: 220px;
}

.search-icon {
  color: var(--app-text-muted);
  display: inline-flex;
}

.search-icon svg {
  width: 16px;
  height: 16px;
}

.search-input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--app-text);
  font-size: 13px;
}

.search-input::placeholder {
  color: var(--app-text-muted);
}

.search-close-button {
  width: 24px;
  height: 24px;
  color: var(--app-text-muted);
  background: transparent;
  border: none;
}

.search-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.search-count {
  width: fit-content;
  text-align: right;
  color: var(--app-text-muted);
  font-size: 11px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.search-nav-button {
  width: 24px;
  height: 24px;
  color: var(--app-text);
  background: transparent;
  border: none;
}

.nav-icon {
  width: 14px;
  height: 14px;
}
</style>
