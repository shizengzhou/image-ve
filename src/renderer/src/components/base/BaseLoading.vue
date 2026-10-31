<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: number | string; overlay?: boolean }>(), {
  size: 40,
  overlay: false
});
</script>

<template>
  <div :class="['base-loading', { 'is-overlay': props.overlay }]">
    <div
      class="spinner"
      :style="{
        width: typeof props.size === 'number' ? `${props.size}px` : props.size,
        height: typeof props.size === 'number' ? `${props.size}px` : props.size
      }"
    ></div>
  </div>
</template>

<style scoped>
.base-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

.is-overlay {
  position: absolute;
  inset: 0;
  z-index: 100;
  background: rgba(16, 20, 24, 0.35);
}

.spinner {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.25);
  border-top-color: #ffffff;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
