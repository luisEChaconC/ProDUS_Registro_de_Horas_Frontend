<script setup lang="ts">
import { computed } from 'vue'
export interface ListColumn {
  key: string
  label: string
}

export interface ListAction {
  key: string
  label: string
  disabledField?: string
}

const props = withDefaults(defineProps<{
  title: string
  items: Record<string, unknown>[]
  columns: ListColumn[]
  actions?: ListAction[]
  addButtonLabel?: string
  emptyMessage?: string
}>(), {
  actions: () => [],
  addButtonLabel: 'Añadir uno nuevo',
  emptyMessage: 'No hay datos para mostrar'
})

const emit = defineEmits<{
  add: []
  action: [payload: { actionKey: string; item: Record<string, unknown> }]
}>()

const gridColumns = computed(() => {
  const totalColumns = props.columns.length + (props.actions.length > 0 ? 1 : 0)
  return {
    gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`
  }
})

const getValue = (item: Record<string, unknown>, key: string): string => {
  const value = item[key]
  if (value === null || value === undefined) return '-'
  return String(value)
}

const getCellClass = (key: string, item: Record<string, unknown>) => {
  if (key !== 'status') return ''
  return item[key] === 'Activo' ? 'status active' : 'status inactive'
}

const isDisabled = (item: Record<string, unknown>, action: ListAction): boolean => {
  if (!action.disabledField) return false
  return !Boolean(item[action.disabledField])
}

const onAction = (actionKey: string, item: Record<string, unknown>) => {
  emit('action', { actionKey, item })
}
</script>

<template>
  <section class="generic-list-section">
    <div class="generic-list-header">
      <h3 class="section-title">{{ title }}</h3>
      <button class="add-item-btn" type="button" @click="emit('add')">{{ addButtonLabel }}</button>
    </div>

    <div class="generic-list-wrapper" v-if="items.length > 0">
      <div class="generic-list-head" :style="gridColumns">
        <span v-for="column in columns" :key="column.key">{{ column.label }}</span>
        <span v-if="props.actions.length > 0">Acciones</span>
      </div>

      <div class="generic-list-row" :style="gridColumns" v-for="(item, index) in items" :key="index">
        <span
          v-for="column in columns"
          :key="column.key"
          :class="getCellClass(column.key, item)"
        >
          {{ getValue(item, column.key) }}
        </span>
        <div class="row-actions" v-if="props.actions.length > 0">
          <button
            v-for="action in props.actions"
            :key="action.key"
            :class="['row-action-btn', `action-${action.key}`]"
            type="button"
            :disabled="isDisabled(item, action)"
            @click="onAction(action.key, item)"
          >
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      {{ emptyMessage }}
    </div>
  </section>
</template>

<style scoped>
.generic-list-section {
  margin-bottom: 3rem;
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
}

.generic-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.5rem;
  color: #003d7a;
  margin-bottom: 0;
  font-weight: 600;
}

.add-item-btn {
  border: 1px solid #003d7a;
  background: #ffffff;
  color: #003d7a;
  padding: 0.45rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}

.generic-list-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

.generic-list-head,
.generic-list-row {
  display: grid;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
  font-size: 0.92rem;
}

.generic-list-head {
  background: #f8fafc;
  font-weight: 700;
  color: #003d7a;
}

.generic-list-row {
  border-top: 1px solid #eef2f7;
  color: #334155;
  align-items: center;
}

.row-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.row-action-btn {
  border: 0;
  background: #64748b;
  color: #ffffff;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.action-edit,
.action-reports {
  background: #0052a3;
}

.action-delete {
  background: #dc2626;
}

.row-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status {
  display: inline-block;
  width: fit-content;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #fee2e2;
  color: #991b1b;
}

.empty-state {
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 1rem;
  color: #64748b;
  text-align: center;
}

@media (max-width: 768px) {
  .generic-list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .generic-list-head,
  .generic-list-row {
    grid-template-columns: 1fr;
  }

  .row-actions {
    margin-top: 0.25rem;
  }
}
</style>
