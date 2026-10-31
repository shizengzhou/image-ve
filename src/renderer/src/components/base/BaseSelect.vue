<script setup lang="ts">
interface Option {
  value: string | number;
  label: string;
}

interface Props {
  modelValue?: string | number;
  options: Option[];
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void;
  (event: 'change', value: string | number): void;
}>();

const handleChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  const value = target.value;
  emit('update:modelValue', value);
  emit('change', value);
};
</script>

<template>
  <select class="base-select" :value="modelValue" :disabled="disabled" @change="handleChange">
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>

<style scoped>
.base-select {
  min-width: 120px;
  height: 28px;
  padding: 0 20px 0 8px;
  border-radius: 6px;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  color: var(--app-text);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 14px;
}

.base-select:focus {
  border-color: var(--option-active-border);
}

.base-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.base-select option {
  background: var(--panel-bg);
  color: var(--app-text);
}
</style>
