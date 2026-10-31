<script setup lang="ts">
import IconClose from '../icons/IconClose.vue';

withDefaults(
  defineProps<{
    message: string;
    type?: 'error';
  }>(),
  {
    type: 'error'
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div class="alert" :class="`is-${type}`">
    <div class="alert-content">{{ message }}</div>
    <button class="alert-close" @click="emit('close')">
      <IconClose />
    </button>
  </div>
</template>

<style scoped>
.alert {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.alert-content {
  flex: 1;
}

.alert-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  line-height: 1;
  transition: all 0.15s ease;
}

.alert-close svg {
  width: 14px;
  height: 14px;
}

/* Error */
.alert.is-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: rgba(239, 68, 68, 0.85);
}

.alert.is-error .alert-close {
  color: rgba(239, 68, 68, 0.6);
}

.alert.is-error .alert-close:hover {
  background: rgba(239, 68, 68, 0.15);
  color: rgba(239, 68, 68, 0.9);
}
</style>
