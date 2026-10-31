<script setup lang="ts">
import { computed } from 'vue';

import IconLoading from '../icons/IconLoading.vue';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  active?: boolean;
  block?: boolean;
  iconOnly?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  loading: false,
  active: false,
  block: false,
  iconOnly: false,
  type: 'button'
});

const emit = defineEmits<{
  (event: 'click', e: MouseEvent): void;
}>();

const classes = computed(() => [
  'base-button',
  `variant-${props.variant}`,
  `size-${props.size}`,
  {
    'is-loading': props.loading,
    'is-disabled': props.disabled || props.loading,
    'is-block': props.block,
    'is-active': props.active,
    'is-icon-only': props.iconOnly
  }
]);

const handleClick = (e: MouseEvent): void => {
  if (props.disabled || props.loading) return;
  emit('click', e);
};
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled || loading" @click="handleClick">
    <span v-if="loading" class="loading-icon">
      <IconLoading />
    </span>
    <span class="button-content" :class="{ 'content-hidden': loading }">
      <slot></slot>
    </span>
  </button>
</template>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-weight: 500;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  outline: none;
  font-family: inherit;
  white-space: nowrap;
  user-select: none;
}

.button-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.is-block {
  display: flex;
  width: 100%;
}

.is-icon-only {
  padding: 0;
  aspect-ratio: 1 / 1;
}

.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Sizes */
.size-sm {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 4px;
}

.size-md {
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  border-radius: 6px;
}

.size-lg {
  height: 36px;
  padding: 0 18px;
  font-size: 14px;
  border-radius: 8px;
}

/* Variants */
.variant-primary {
  background: #4c8bf5;
  color: #ffffff;
}

.variant-primary:hover:not(:disabled) {
  background: #5d97f6;
}

.variant-primary:active:not(:disabled) {
  background: #3b7ae6;
}

.variant-secondary {
  background: var(--button-secondary-bg);
  border-color: var(--button-secondary-border);
  color: var(--app-text);
}

.variant-secondary:hover:not(:disabled) {
  background: var(--button-secondary-hover);
  border-color: var(--option-active-border);
}

.variant-secondary:active:not(:disabled),
.variant-secondary.is-active {
  background: var(--option-active-bg);
  border-color: var(--option-active-border);
  color: var(--option-active-text);
}

.variant-ghost {
  background: transparent;
  color: var(--app-text-muted);
}

.variant-ghost:hover:not(:disabled) {
  background: var(--button-secondary-bg);
  color: var(--app-text);
}

.variant-ghost.is-active {
  background: var(--button-secondary-bg);
  color: var(--app-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* Loading */
.loading-icon {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1em;
  height: 1em;
}

.loading-icon svg {
  animation: spin 1s linear infinite;
  width: 100%;
  height: 100%;
}

.content-hidden {
  visibility: hidden;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
