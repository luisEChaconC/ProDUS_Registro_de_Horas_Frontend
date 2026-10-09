<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppButton from '@/components/AppButton.vue'
import GenericDataList from '@/components/GenericDataList.vue'
import GenericForm from '@/components/GenericForm.vue'
import ScheduleBuilder from '@/components/ScheduleBuilder.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import { assistantFormFields } from '@/forms/assistantForm.schema'
import { useAuth } from '@/composables/useAuth'
import api from '@/services/api'

const router = useRouter()
const { userRole, userName, logout } = useAuth()
const showAssistantForm = ref(false)
const showErrorModal = ref(false)
const errorMessages = ref<string[]>([])
const showScheduleModal = ref(false)
const scheduleValidationError = ref('')
const scheduleModalError = ref('')
const isScheduleConfirmed = ref(false)
const ASSISTANT_SCHEDULE_STORAGE_KEY = 'assistant_create_schedule_blocks'
const ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY = 'assistant_create_schedule_draft_blocks'

const assistantColumns = [
  { key: 'name', label: 'Usuario' },
  { key: 'role', label: 'Rol' },
  { key: 'status', label: 'Estado' }
]

const assistantActions = [
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Eliminar', disabledField: 'canDelete' }
]

interface AssistantRow {
  id: number
  username: string
  name: string
  role: string
  status: string
  canDelete: boolean
}

const assistants = ref<AssistantRow[]>([])

const getScheduleBlocks = (storageKey: string): unknown[] => {
  const rawValue = localStorage.getItem(storageKey)
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const loadAssistants = async () => {
  try {
    const response = await api.listAssistants()
    assistants.value = response.results.map((item) => ({
      id: item.id,
      username: item.username,
      name: item.full_name,
      role: 'Asistente',
      status: item.is_active ? 'Activo' : 'Inactivo',
      canDelete: false,
    }))
  } catch (error) {
  }
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

const onAddAssistant = () => {
  localStorage.removeItem(ASSISTANT_SCHEDULE_STORAGE_KEY)
  localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)
  showScheduleModal.value = false
  scheduleValidationError.value = ''
  scheduleModalError.value = ''
  isScheduleConfirmed.value = false
  showAssistantForm.value = true
}

const onOpenScheduleModal = () => {
  scheduleModalError.value = ''

  const currentBlocks = localStorage.getItem(ASSISTANT_SCHEDULE_STORAGE_KEY)
  if (currentBlocks) {
    localStorage.setItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY, currentBlocks)
  } else {
    localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)
  }

  showScheduleModal.value = true
}

const onCancelScheduleModal = () => {
  const draftBlocks = getScheduleBlocks(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)

  if (!draftBlocks.length) {
    localStorage.removeItem(ASSISTANT_SCHEDULE_STORAGE_KEY)
    isScheduleConfirmed.value = false
    scheduleValidationError.value = 'Hace falta el horario.'
  }

  localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)
  scheduleModalError.value = ''
  showScheduleModal.value = false
}

const onConfirmScheduleModal = () => {
  const draftBlocks = getScheduleBlocks(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)

  if (!draftBlocks.length) {
    scheduleModalError.value = 'Debes agregar al menos un bloque de horario.'
    return
  }

  localStorage.setItem(ASSISTANT_SCHEDULE_STORAGE_KEY, JSON.stringify(draftBlocks))
  localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)

  isScheduleConfirmed.value = true
  scheduleValidationError.value = ''
  scheduleModalError.value = ''
  showScheduleModal.value = false
}

const onAssistantAction = (payload: { actionKey: string; item: Record<string, unknown> }) => {
  console.log(`Acción: ${payload.actionKey} en asistente:`, payload.item)
  // TODO: Implementar lógica de editar/eliminar
}

const onConfirmAssistantForm = async (formData: Record<string, any>) => {
  if (!isScheduleConfirmed.value) {
    scheduleValidationError.value = 'Debes configurar y confirmar el horario inicial antes de guardar.'
    return
  }

  // Extraemos lo guardado en LocalStorage
  const confirmedBlocks = getScheduleBlocks(ASSISTANT_SCHEDULE_STORAGE_KEY) as Array<{
    day_of_week: string,
    start_time: string,
    end_time: string
  }>

  try {
    const payload = {
      username: formData.username as string,
      full_name: formData.full_name as string, 
      password: formData.password as string | undefined,
      password_confirm: formData.password_confirm as string | undefined, 
      start_date: formData.start_date ? new Date(formData.start_date as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      end_date: formData.end_date ? new Date(formData.end_date as string).toISOString().split('T')[0] : null,
      weekly_hours: Number(formData.weekly_hours), 
      // Adjuntar los horarios sin work_minutes
      schedule_blocks: confirmedBlocks.map(block => ({
         day_of_week: block.day_of_week,
         start_time: block.start_time,
         end_time: block.end_time
      }))
    } as any

    await api.createAssistant(payload)
    
    // Si funciona, limpiamos todo y cerramos
    localStorage.removeItem(ASSISTANT_SCHEDULE_STORAGE_KEY)
    localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)
    scheduleValidationError.value = ''
    scheduleModalError.value = ''
    isScheduleConfirmed.value = false
    showScheduleModal.value = false
    showAssistantForm.value = false
    await loadAssistants()
  } catch (error) {
    if (error instanceof Error) {
      try {
        const parsedMsgs = JSON.parse(error.message)
        if (Array.isArray(parsedMsgs)) {
          errorMessages.value = parsedMsgs
        } else {
          errorMessages.value = [error.message]
        }
      } catch {
        errorMessages.value = [error.message]
      }
    } else {
      errorMessages.value = ['Ocurrió un error desconocido al procesar la solicitud.']
    }
    showErrorModal.value = true
  }
}

const onCancelAssistantForm = () => {
  localStorage.removeItem(ASSISTANT_SCHEDULE_STORAGE_KEY)
  localStorage.removeItem(ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY)
  scheduleValidationError.value = ''
  scheduleModalError.value = ''
  isScheduleConfirmed.value = false
  showScheduleModal.value = false
  showAssistantForm.value = false
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadAssistants()
})
</script>

<template>
  <div class="manage-assistants-container">
    <!-- Header -->
    <AppHeader 
      title="ProDUS"
      subtitle="Gestión de Asistentes"
      :user-role="userRole || 'Usuario'"
      :user-name="userName || 'Usuario'"
      @logout="handleLogout"
    />

    <!-- Contenido principal -->
    <div class="main-content">
      <button @click="goBack" class="back-button">← Volver</button>

      <GenericDataList
        title="Gestión de Asistentes"
        :columns="assistantColumns"
        :items="assistants"
        :actions="assistantActions"
        add-button-label="Añadir nuevo asistente"
        @add="onAddAssistant"
        @action="onAssistantAction"
      />

      <GenericForm
        v-if="showAssistantForm"
        title="Nuevo Asistente"
        :fields="assistantFormFields"
        confirm-text="Confirmar"
        cancel-text="Cancelar"
        @confirm="onConfirmAssistantForm"
        @cancel="onCancelAssistantForm"
      >
        <template #extra>
          <div class="schedule-action-row">
            <AppButton variant="secondary" size="md" @click="onOpenScheduleModal">
              Configurar horario inicial
            </AppButton>
            <p class="schedule-status" :class="{ confirmed: isScheduleConfirmed }">
              {{ isScheduleConfirmed ? 'Horario confirmado' : 'Horario pendiente por confirmar' }}
            </p>
            <p v-if="scheduleValidationError" class="schedule-error">{{ scheduleValidationError }}</p>
          </div>
        </template>
      </GenericForm>

      <div v-if="showScheduleModal" class="schedule-modal-overlay">
        <div class="schedule-modal-card">
          <ScheduleBuilder
            :storage-key="ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY"
            heading="Horario inicial"
            subheading="Cuando termines, confirma para guardar este horario en el asistente."
          />

          <p v-if="scheduleModalError" class="schedule-error">{{ scheduleModalError }}</p>

          <div class="schedule-modal-actions">
            <AppButton variant="secondary" size="md" @click="onCancelScheduleModal">
              Cancelar
            </AppButton>
            <AppButton variant="primary" size="md" @click="onConfirmScheduleModal">
              Confirmar horario
            </AppButton>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Modal de errores de backend -->
  <ErrorModal 
    :show="showErrorModal" 
    :messages="errorMessages"
    @close="showErrorModal = false"
  />
</template>

<style scoped>
.manage-assistants-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.main-content {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-button {
  display: inline-block;
  padding: 0.5rem 1rem;
  margin-bottom: 1.5rem;
  background-color: #e0e0e0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #d0d0d0;
}

.schedule-action-row {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schedule-status {
  margin: 0;
  color: var(--color-text-muted);
}

.schedule-status.confirmed {
  color: var(--color-success-dark);
  font-weight: 600;
}

.schedule-error {
  margin: 0;
  color: var(--color-error-dark);
  font-weight: 600;
}

.schedule-modal-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, var(--color-text) 35%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.schedule-modal-card {
  width: min(960px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.schedule-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
