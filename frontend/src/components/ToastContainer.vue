<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, dismissToast } = useToast()
</script>

<template>
  <div class="toast-container" aria-live="polite" aria-atomic="true">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="`toast-${toast.type}`"
      role="alert"
    >
      <span>{{ toast.message }}</span>
      <button type="button" aria-label="Cerrar notificación" @click="dismissToast(toast.id)">×</button>
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 3000;
  display: flex;
  width: min(420px, calc(100vw - 2rem));
  flex-direction: column;
  gap: .75rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: .9rem 1rem;
  border-left: 4px solid;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .2);
  color: #1f2937;
  pointer-events: auto;
}

.toast-error { border-color: #dc2626; }
.toast-success { border-color: #16a34a; }
.toast-info { border-color: #2563eb; }

.toast button {
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0;
}
</style>
