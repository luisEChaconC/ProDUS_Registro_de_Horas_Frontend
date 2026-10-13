<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppButton from '@/components/AppButton.vue'
import GenericDataList from '@/components/GenericDataList.vue'
import GenericForm from '@/components/GenericForm.vue'
import ScheduleBuilder from '@/components/ScheduleBuilder.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import { assistantFormFields } from '@/forms/assistantForm.schema'
import { useAuth } from '@/composables/useAuth'
import api, { type AssistantAdminDetail, type AssistantReport, type ScheduleBlockInput } from '@/services/api'

const router = useRouter()
const { userRole, userName, userId, logout } = useAuth()
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
  { key: 'reports', label: 'Ver reportes' },
  { key: 'delete', label: 'Borrar' }
]

interface AssistantRow {
  id: number
  username: string
  name: string
  role: string
  status: string
}

const assistants = ref<AssistantRow[]>([])
const editingAssistant = ref<AssistantAdminDetail | null>(null)
const assistantReports = ref<AssistantReport[]>([])
const showEditModal = ref(false)
const showReportsModal = ref(false)
const reportsAssistant = ref<AssistantRow | null>(null)
const reportsLoading = ref(false)
const reportsError = ref('')
const editLoading = ref(false)
const editSaving = ref(false)
const editError = ref('')
const editForm = reactive({
  username: '',
  full_name: '',
  is_active: true,
  start_date: '',
  end_date: '',
  weekly_hours: 10,
  schedule_blocks: [] as ScheduleBlockInput[],
})

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
  if (payload.actionKey === 'edit') {
    void openAssistantEditor(Number(payload.item.id))
  } else if (payload.actionKey === 'reports') {
    void openAssistantReports(Number(payload.item.id))
  } else if (payload.actionKey === 'delete') {
    const assistant = assistants.value.find((item) => item.id === Number(payload.item.id))
    if (assistant) void deleteAssistant(assistant)
  }
}

const deleteAssistant = async (assistant: AssistantRow) => {
  if (userId.value === assistant.id) {
    window.alert('No puedes eliminar tu propio usuario.')
    return
  }
  if (!window.confirm(`¿Deseas eliminar al asistente "${assistant.username}"? Esta acción no se puede deshacer.`)) return

  try {
    await api.deleteUser(assistant.id)
    await loadAssistants()
  } catch (error) {
    errorMessages.value = [error instanceof Error ? error.message : 'No se pudo eliminar el asistente.']
    showErrorModal.value = true
  }
}

const openAssistantEditor = async (assistantId: number) => {
  showEditModal.value = true
  editLoading.value = true
  editError.value = ''
  try {
    const detail = await api.getAssistantAdminDetail(assistantId)
    editingAssistant.value = detail
    editForm.username = detail.username
    editForm.full_name = detail.full_name
    editForm.is_active = detail.is_active
    editForm.start_date = detail.start_date
    editForm.end_date = detail.end_date || ''
    editForm.weekly_hours = detail.weekly_hours
    editForm.schedule_blocks = detail.schedule_blocks.map((block) => ({ ...block }))
  } catch (error) {
    editError.value = error instanceof Error ? error.message : 'No se pudo cargar la información del asistente.'
  } finally {
    editLoading.value = false
  }
}

const closeAssistantEditor = () => {
  showEditModal.value = false
  editingAssistant.value = null
}

const openAssistantReports = async (assistantId: number) => {
  showReportsModal.value = true
  reportsLoading.value = true
  reportsError.value = ''
  reportsAssistant.value = assistants.value.find((assistant) => assistant.id === assistantId) || null
  try {
    assistantReports.value = await api.getAssistantReports(assistantId)
  } catch (error) {
    reportsError.value = error instanceof Error ? error.message : 'No se pudieron cargar los reportes.'
  } finally {
    reportsLoading.value = false
  }
}

const closeAssistantReports = () => {
  showReportsModal.value = false
  reportsAssistant.value = null
  assistantReports.value = []
}

const addScheduleBlock = () => {
  editForm.schedule_blocks.push({ day_of_week: 'MONDAY', start_time: '08:00', end_time: '17:00' })
}

const removeScheduleBlock = (index: number) => {
  editForm.schedule_blocks.splice(index, 1)
}

const saveAssistantEditor = async () => {
  if (!editingAssistant.value) return
  editSaving.value = true
  editError.value = ''
  try {
    await api.updateAssistantAdminDetail(editingAssistant.value.id, {
      username: editForm.username,
      full_name: editForm.full_name,
      is_active: editForm.is_active,
      start_date: editForm.start_date,
      end_date: editForm.end_date || null,
      weekly_hours: Number(editForm.weekly_hours),
      schedule_blocks: editForm.schedule_blocks,
    })
    await loadAssistants()
    closeAssistantEditor()
  } catch (error) {
    editError.value = error instanceof Error ? error.message : 'No se pudo guardar el asistente.'
  } finally {
    editSaving.value = false
  }
}

const saveReport = async (report: AssistantReport) => {
  if (!editingAssistant.value) return
  try {
    const updated = await api.updateAssistantReport(editingAssistant.value.id, {
      id: report.id,
      check_out: report.check_out,
      work_description: report.work_description,
      break_minutes: report.break_minutes,
    })
    const index = assistantReports.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) assistantReports.value[index] = updated
  } catch (error) {
    reportsError.value = error instanceof Error ? error.message : 'No se pudo actualizar el reporte.'
  }
}

const deleteReport = async (report: AssistantReport) => {
  if (!editingAssistant.value || !window.confirm('¿Eliminar este reporte de horas?')) return
  try {
    await api.deleteAssistantReport(editingAssistant.value.id, report.id)
    assistantReports.value = assistantReports.value.filter((item) => item.id !== report.id)
  } catch (error) {
    reportsError.value = error instanceof Error ? error.message : 'No se pudo eliminar el reporte.'
  }
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
      <button @click="goBack" class="back-button">Volver al inicio</button>

      <GenericDataList
        title="Gestión de Asistentes"
        :columns="assistantColumns"
        :items="assistants"
        :actions="assistantActions"
        add-button-label="Añadir nuevo asistente"
        @add="onAddAssistant"
        @action="onAssistantAction"
      />

      <div v-if="showAssistantForm" class="schedule-modal-overlay">
        <div class="new-assistant-modal-card">
          <GenericForm
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
        </div>
      </div>

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

      <div v-if="showEditModal" class="schedule-modal-overlay">
        <div class="edit-modal-card">
          <div class="modal-heading">
            <h2>Editar asistente</h2>
          </div>
          <p v-if="editLoading">Cargando información...</p>
          <p v-if="editError" class="schedule-error">{{ editError }}</p>
          <form v-if="!editLoading" @submit.prevent="saveAssistantEditor">
            <div class="edit-grid">
              <label>Usuario <input v-model.trim="editForm.username" required /></label>
              <label>Nombre completo <input v-model.trim="editForm.full_name" required /></label>
              <label>Estado
                <select v-model="editForm.is_active">
                  <option :value="true">Activo</option>
                  <option :value="false">Inactivo</option>
                </select>
              </label>
              <label>Horas semanales <input v-model.number="editForm.weekly_hours" type="number" min="1" required /></label>
              <label>Fecha de inicio <input v-model="editForm.start_date" type="date" required /></label>
              <label>Fecha de finalización <input v-model="editForm.end_date" type="date" /></label>
            </div>

            <h3>Horario</h3>
            <div v-for="(block, index) in editForm.schedule_blocks" :key="index" class="schedule-edit-row">
              <select v-model="block.day_of_week">
                <option value="MONDAY">Lunes</option><option value="TUESDAY">Martes</option>
                <option value="WEDNESDAY">Miércoles</option><option value="THURSDAY">Jueves</option>
                <option value="FRIDAY">Viernes</option><option value="SATURDAY">Sábado</option><option value="SUNDAY">Domingo</option>
              </select>
              <input v-model="block.start_time" type="time" required />
              <input v-model="block.end_time" type="time" required />
              <button type="button" class="delete-button" @click="removeScheduleBlock(index)">Quitar</button>
            </div>
            <button type="button" class="secondary-button" @click="addScheduleBlock">Agregar bloque</button>

            <div class="schedule-modal-actions">
              <AppButton variant="secondary" size="md" @click="closeAssistantEditor">Cancelar</AppButton>
              <AppButton variant="primary" size="md" type="submit" :disabled="editSaving">
                {{ editSaving ? 'Guardando...' : 'Guardar' }}
              </AppButton>
            </div>
          </form>
        </div>
      </div>

      <div v-if="showReportsModal" class="schedule-modal-overlay">
        <div class="edit-modal-card reports-modal-card">
          <div class="modal-heading">
            <h2>Reportes de {{ reportsAssistant?.name || 'asistente' }}</h2>
          </div>
          <p v-if="reportsLoading">Cargando reportes...</p>
          <p v-if="reportsError" class="schedule-error">{{ reportsError }}</p>
          <p v-if="!reportsLoading && !reportsError && !assistantReports.length">
            Este asistente no tiene reportes.
          </p>
          <div v-for="report in assistantReports" :key="report.id" class="report-edit-row">
            <span>{{ new Date(report.check_in).toLocaleString('es-MX') }}</span>
            <input v-model="report.check_out" type="datetime-local" />
            <input v-model.number="report.break_minutes" type="number" min="0" placeholder="Almuerzo (min)" />
            <input v-model="report.work_description" placeholder="Descripción" />
            <button type="button" class="save-button" @click="saveReport(report)">Guardar</button>
            <button type="button" class="delete-button" @click="deleteReport(report)">Borrar</button>
          </div>
          <div class="schedule-modal-actions">
            <AppButton variant="secondary" size="md" @click="closeAssistantReports">Cerrar</AppButton>
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
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  color: #003d7a;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}

.back-button:hover {
  background: #f8fafc;
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
.new-assistant-modal-card {
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem;
}
.schedule-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.edit-modal-card {
  width: min(1100px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
}
.modal-heading { display: flex; justify-content: space-between; align-items: center; }
.modal-heading h2 { margin: 0; color: var(--color-primary); }
.close-button { border: 0; background: transparent; font-size: 1.8rem; cursor: pointer; }
.edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
.edit-grid label { display: flex; flex-direction: column; gap: .4rem; font-weight: 600; }
.edit-grid input, .edit-grid select, .schedule-edit-row input, .schedule-edit-row select, .report-edit-row input {
  min-width: 0; padding: .55rem; border: 1px solid var(--color-border); border-radius: 6px; font: inherit;
}
.edit-modal-card h3 { margin: 1.5rem 0 .75rem; color: var(--color-primary); }
.schedule-edit-row, .report-edit-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: .5rem; margin-bottom: .6rem; }
.report-edit-row { grid-template-columns: 1.2fr 1fr .8fr 1.5fr auto auto; align-items: center; }
.secondary-button, .save-button, .delete-button { border: 0; border-radius: 6px; padding: .55rem .75rem; color: white; cursor: pointer; font: inherit; font-weight: 600; }
.secondary-button { background: #64748b; }
.save-button { background: #0052a3; }
.delete-button { background: #dc2626; }
@media (max-width: 800px) {
  .edit-grid, .schedule-edit-row, .report-edit-row { grid-template-columns: 1fr; }
}
</style>
