<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppButton from '@/components/AppButton.vue'
import GenericForm from '@/components/GenericForm.vue'
import ScheduleBuilder from '@/components/ScheduleBuilder.vue'
import ErrorModal from '@/components/ErrorModal.vue'
import { assistantFormFields } from '@/forms/assistantForm.schema'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import api, { getApiErrorMessages, type AssistantAdminDetail, type AssistantReport, type CoordinatorOption, type ProjectOption, type ScheduleBlockInput } from '@/services/api'

const router = useRouter()
const { userRole, userName, userId, logout } = useAuth()
const { showToast } = useToast()
const showAssistantForm = ref(false)
const showErrorModal = ref(false)
const errorMessages = ref<string[]>([])
const showScheduleModal = ref(false)
const scheduleValidationError = ref('')
const scheduleModalError = ref('')
const isScheduleConfirmed = ref(false)
const ASSISTANT_SCHEDULE_STORAGE_KEY = 'assistant_create_schedule_blocks'
const ASSISTANT_SCHEDULE_DRAFT_STORAGE_KEY = 'assistant_create_schedule_draft_blocks'

interface AssistantRow {
  id: number
  username: string
  name: string
  role: string
  status: string
}

const assistants = ref<AssistantRow[]>([])
const assistantsLoading = ref(true)
const editingAssistant = ref<AssistantAdminDetail | null>(null)
const assistantReports = ref<AssistantReport[]>([])
const showEditModal = ref(false)
const showReportsModal = ref(false)
const reportsAssistant = ref<AssistantRow | null>(null)
const reportsScope = ref<'assistant' | 'all'>('assistant')
const reportsLoading = ref(false)
const reportsError = ref('')
const reportSuccess = ref('')
const reportToastType = ref<'success' | 'error'>('success')
const reportToastTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const reportSaving = ref(false)
const reportProjects = ref<ProjectOption[]>([])
const reportManagers = ref<CoordinatorOption[]>([])
const selectedReport = ref<AssistantReport | null>(null)
const addingReportAssistantId = ref<number | null>(null)
const showCreateReportForm = ref(false)
const newReport = reactive({
  check_in: '',
  check_out: '',
  project_id: null as number | null,
  manager_user_id: null as number | null,
  break_minutes: 0,
  activities: '',
  work_description: '',
  notes: '',
})
const reportStartDate = ref('')
const reportEndDate = ref('')
const reportTotalSeconds = ref(0)
const editLoading = ref(false)
const editSaving = ref(false)
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

const showReportToast = (message: string, type: 'success' | 'error') => {
  if (reportToastTimer.value) clearTimeout(reportToastTimer.value)
  reportToastType.value = type
  reportSuccess.value = message
  reportToastTimer.value = setTimeout(() => {
    reportSuccess.value = ''
    reportToastTimer.value = null
  }, 5000)
}

const getWorkedSeconds = (report: AssistantReport) =>
  Math.max(0, report.elapsed_seconds - report.break_minutes * 60)

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`
}

const csvValue = (value: string | number | null) => {
  const text = value === null ? '' : String(value)
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

const exportReports = () => {
  if (!assistantReports.value.length) return
  const headers = [
    ...(reportsScope.value === 'all' ? ['Asistente'] : []),
    'Inicio',
    'Finalización',
    'Horas contabilizadas',
    'Estado',
    'Proyecto',
    'Encargado',
    'Minutos de almuerzo',
    'Actividades realizadas',
    'Descripción del trabajo',
    'Notas',
  ]
  const rows = assistantReports.value.map((report) => [
    ...(reportsScope.value === 'all' ? [report.assistant_name || 'Sin nombre'] : []),
    formatReportDate(report.check_in),
    formatReportDate(report.check_out),
    formatDuration(getWorkedSeconds(report)),
    report.status_code,
    report.project_name || 'Sin proyecto',
    report.manager_name || 'Sin encargado',
    report.break_minutes,
    report.activities || '',
    report.work_description || '',
    report.notes || '',
  ])
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${reportsScope.value === 'all' ? 'reportes-todos-los-asistentes' : 'reportes-asistente'}-${reportStartDate.value || 'todos'}-${reportEndDate.value || 'todos'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

const formatReportDate = (value: string | null) => {
  if (!value) return 'Pendiente'
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const loadAssistants = async () => {
  assistantsLoading.value = true
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
    errorMessages.value = [error instanceof Error ? error.message : 'No se pudieron cargar los asistentes.']
    showErrorModal.value = true
  } finally {
    assistantsLoading.value = false
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

const openAllReports = async () => {
  showReportsModal.value = true
  reportsError.value = ''
  reportSuccess.value = ''
  reportsScope.value = 'all'
  reportsAssistant.value = null
  setCurrentReportWeek()
  await loadAssistantReports()
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
    showToast(error instanceof Error ? error.message : 'No se pudo cargar la información del asistente.', 'error')
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
  reportsError.value = ''
  reportSuccess.value = ''
  reportsScope.value = 'assistant'
  reportsAssistant.value = assistants.value.find((assistant) => assistant.id === assistantId) || null
  setCurrentReportWeek()
  await loadAssistantReports(assistantId)
}

const getCurrentDateTimeInput = () => {
  const date = new Date()
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const addAssistantReport = async (assistant: AssistantRow) => {
  reportsError.value = ''
  reportSuccess.value = ''
  newReport.check_in = getCurrentDateTimeInput()
  newReport.check_out = getCurrentDateTimeInput()
  newReport.project_id = null
  newReport.manager_user_id = null
  newReport.break_minutes = 0
  newReport.activities = ''
  newReport.work_description = ''
  newReport.notes = ''
  await openAssistantReports(assistant.id)
  showCreateReportForm.value = true
}

const createAssistantReport = async () => {
  if (!reportsAssistant.value) return
  addingReportAssistantId.value = reportsAssistant.value.id
  reportsError.value = ''
  reportSuccess.value = ''
  try {
    await api.createAssistantReport(reportsAssistant.value.id, {
      check_in: toApiDateTime(newReport.check_in),
      check_out: newReport.check_out ? toApiDateTime(newReport.check_out) : null,
      project_id: newReport.project_id,
      manager_user_id: newReport.manager_user_id,
      break_minutes: newReport.break_minutes,
      activities: newReport.activities,
      work_description: newReport.work_description,
      notes: newReport.notes,
    })
    showCreateReportForm.value = false
    await loadAssistantReports(reportsAssistant.value.id)
    showReportToast('Reporte creado correctamente.', 'success')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el reporte.'
    reportsError.value = message
    showReportToast(message, 'error')
  } finally {
    addingReportAssistantId.value = null
  }
}

const loadAssistantReports = async (assistantId = reportsAssistant.value?.id) => {
  if (reportsScope.value === 'assistant' && !assistantId) return
  reportsLoading.value = true
  reportsError.value = ''
  try {
    const [reports, projects, managers] = await Promise.all([
      reportsScope.value === 'all'
        ? api.getAllAssistantReports({
            start_date: reportStartDate.value || undefined,
            end_date: reportEndDate.value || undefined,
          })
        : api.getAssistantReports(assistantId as number, {
            start_date: reportStartDate.value || undefined,
            end_date: reportEndDate.value || undefined,
          }),
      api.getActiveProjects(),
      api.getActiveCoordinators(),
    ])
    assistantReports.value = reports.results.map((report) => ({
      ...report,
      check_in: formatDateTimeInput(report.check_in),
      check_out: report.check_out ? formatDateTimeInput(report.check_out) : null,
    }))
    reportTotalSeconds.value = reports.total_seconds
    selectedReport.value = null
    reportSuccess.value = ''
    reportProjects.value = projects.results
    reportManagers.value = managers.results
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los reportes.'
    reportsError.value = message
    showReportToast(message, 'error')
  } finally {
    reportsLoading.value = false
  }
}

const formatInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const setCurrentReportWeek = () => {
  const today = new Date()
  const daysSinceMonday = today.getDay() === 0 ? 6 : today.getDay() - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysSinceMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  reportStartDate.value = formatInputDate(weekStart)
  reportEndDate.value = formatInputDate(weekEnd)
}

const consultAssistantReports = () => {
  void loadAssistantReports()
}

const closeAssistantReports = () => {
  showReportsModal.value = false
  showCreateReportForm.value = false
  reportsAssistant.value = null
  assistantReports.value = []
  reportProjects.value = []
  reportManagers.value = []
  selectedReport.value = null
  reportStartDate.value = ''
  reportEndDate.value = ''
  reportTotalSeconds.value = 0
  reportSuccess.value = ''
  reportsScope.value = 'assistant'
}

const openReportDetails = (report: AssistantReport) => {
  selectedReport.value = report
  reportsError.value = ''
  reportSuccess.value = ''
}

const closeReportDetails = () => {
  selectedReport.value = null
  reportSuccess.value = ''
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
    showToast(error instanceof Error ? error.message : 'No se pudo guardar el asistente.', 'error')
  } finally {
    editSaving.value = false
  }
}

const saveReport = async (report: AssistantReport) => {
  if (reportsScope.value === 'assistant' && !reportsAssistant.value) return
  reportSaving.value = true
  reportsError.value = ''
  reportSuccess.value = ''
  try {
    const payload = {
      id: report.id,
      check_in: toApiDateTime(report.check_in),
      check_out: report.check_out ? toApiDateTime(report.check_out) : null,
      project_id: report.project_id ?? null,
      manager_user_id: report.manager_user_id ?? null,
      work_description: report.work_description,
      activities: report.activities,
      notes: report.notes,
      break_minutes: report.break_minutes,
    }
    const updated = reportsScope.value === 'all'
      ? await api.updateAllAssistantReport(payload)
      : await api.updateAssistantReport(reportsAssistant.value!.id, payload)
    const index = assistantReports.value.findIndex((item) => item.id === updated.id)
    if (index >= 0) {
      const savedReport = {
        ...updated,
        check_in: formatDateTimeInput(updated.check_in),
        check_out: updated.check_out ? formatDateTimeInput(updated.check_out) : null,
      }
      assistantReports.value[index] = savedReport
      selectedReport.value = savedReport
      showReportToast('Reporte guardado correctamente.', 'success')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el reporte.'
    reportsError.value = message
    showReportToast(message, 'error')
  } finally {
    reportSaving.value = false
  }
}

const formatDateTimeInput = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toApiDateTime = (value: string) => {
  const date = new Date(value)
  return date.toISOString()
}

const deleteReport = async (report: AssistantReport) => {
  if ((reportsScope.value === 'assistant' && !reportsAssistant.value) || !window.confirm('¿Eliminar este reporte de horas?')) return
  try {
    if (reportsScope.value === 'all') {
      await api.deleteAllAssistantReport(report.id)
    } else {
      await api.deleteAssistantReport(reportsAssistant.value!.id, report.id)
    }
    assistantReports.value = assistantReports.value.filter((item) => item.id !== report.id)
    if (selectedReport.value?.id === report.id) closeReportDetails()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el reporte.'
    reportsError.value = message
    showReportToast(message, 'error')
  }
}

onUnmounted(() => {
  if (reportToastTimer.value) clearTimeout(reportToastTimer.value)
})

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
    errorMessages.value = getApiErrorMessages(error, 'No se pudo crear el asistente.')
    showToast(errorMessages.value.join(' '), 'error')
    showErrorModal.value = false
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
      <button class="back-button" type="button" @click="goBack">Volver al inicio</button>
      <div class="heading">
        <div>
          <p class="eyebrow">Administración</p>
          <h2>Asistentes del sistema</h2>
          <p class="intro">Crea, edita, consulta reportes o elimina usuarios con rol asistente.</p>
        </div>
        <div class="heading-actions">
          <button type="button" class="secondary-heading-button" @click="openAllReports">Gestionar reportes de todos los asistentes</button>
          <button type="button" class="primary-button" @click="onAddAssistant">Añadir asistente</button>
        </div>
      </div>
      <section v-if="assistantsLoading" class="card state">Cargando asistentes...</section>
      <section v-else-if="assistants.length === 0" class="card state">No hay asistentes registrados.</section>
      <section v-else class="card table-wrapper">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Nombre completo</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="assistant in assistants" :key="assistant.id">
              <td>{{ assistant.username }}</td>
              <td>{{ assistant.name || '-' }}</td>
              <td>
                <span :class="['status', assistant.status === 'Activo' ? 'active' : 'inactive']">
                  {{ assistant.status }}
                </span>
              </td>
              <td class="actions">
                <button class="edit-button" type="button" @click="openAssistantEditor(assistant.id)">Editar</button>
                <button class="reports-button" type="button" @click="openAssistantReports(assistant.id)">Ver reportes</button>
                <button
                  class="add-report-button"
                  type="button"
                  :disabled="addingReportAssistantId === assistant.id"
                  @click="addAssistantReport(assistant)"
                >
                  {{ addingReportAssistantId === assistant.id ? 'Creando...' : 'Agregar reporte' }}
                </button>
                <button class="delete-button" type="button" @click="deleteAssistant(assistant)">Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

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
            <h2>{{ reportsScope === 'all' ? 'Reportes de todos los asistentes' : `Reportes de ${reportsAssistant?.name || 'asistente'}` }}</h2>
          </div>
          <template v-if="!showCreateReportForm">
            <div class="report-filters">
              <label>Desde <input v-model="reportStartDate" type="date" /></label>
              <label>Hasta <input v-model="reportEndDate" type="date" /></label>
              <button type="button" class="save-button" :disabled="reportsLoading" @click="consultAssistantReports">
                {{ reportsLoading ? 'Consultando...' : 'Consultar' }}
              </button>
              <button type="button" class="secondary-button" :disabled="reportsLoading || !assistantReports.length" @click="exportReports">
                Exportar CSV
              </button>
            </div>
            <section v-if="reportsScope === 'assistant'" class="report-total">
              Total de horas registradas en el periodo seleccionado:
              <strong>{{ formatDuration(reportTotalSeconds) }}</strong>
            </section>
            <p v-if="reportsLoading">Cargando reportes...</p>
            <p v-if="!reportsLoading && !reportsError && !assistantReports.length">
              Este asistente no tiene reportes.
            </p>
          </template>
          <form v-if="showCreateReportForm" class="report-editor" @submit.prevent="createAssistantReport">
            <div class="report-summary">
              <strong>Nuevo reporte para {{ reportsAssistant?.name || 'asistente' }}</strong>
            </div>
            <div class="report-details-grid">
              <label>Fecha y hora de inicio
                <input v-model="newReport.check_in" type="datetime-local" required />
              </label>
              <label>Fecha y hora de finalización
                <input v-model="newReport.check_out" type="datetime-local" />
              </label>
              <label>Proyecto
                <select v-model="newReport.project_id">
                  <option :value="null">Sin proyecto</option>
                  <option v-for="project in reportProjects" :key="project.id" :value="project.id">{{ project.name }}</option>
                </select>
              </label>
              <label>Encargado
                <select v-model="newReport.manager_user_id">
                  <option :value="null">Sin encargado</option>
                  <option v-for="manager in reportManagers" :key="manager.id" :value="manager.id">
                    {{ manager.full_name || manager.username }}
                  </option>
                </select>
              </label>
              <label>Minutos de almuerzo
                <input v-model.number="newReport.break_minutes" type="number" min="0" required />
              </label>
              <label class="full-width">Actividades realizadas
                <textarea v-model="newReport.activities" rows="3"></textarea>
              </label>
              <label class="full-width">Descripción del trabajo
                <textarea v-model="newReport.work_description" rows="3"></textarea>
              </label>
              <label class="full-width">Notas
                <textarea v-model="newReport.notes" rows="3"></textarea>
              </label>
            </div>
            <div class="report-detail-actions">
              <button type="button" class="secondary-button" @click="showCreateReportForm = false">Cancelar</button>
              <button type="submit" class="save-button" :disabled="addingReportAssistantId !== null">
                {{ addingReportAssistantId !== null ? 'Creando...' : 'Crear reporte' }}
              </button>
            </div>
          </form>
          <div v-else-if="!selectedReport" class="report-preview-list">
            <div
              v-for="report in assistantReports"
              :key="report.id"
              :class="['report-preview-row', { 'all-reports-preview-row': reportsScope === 'all' }]"
            >
              <div v-if="reportsScope === 'all'"><strong>Asistente</strong><span>{{ report.assistant_name || 'Sin nombre' }}</span></div>
              <div><strong>Inicio</strong><span>{{ formatReportDate(report.check_in) }}</span></div>
              <div><strong>Finalización</strong><span>{{ formatReportDate(report.check_out) }}</span></div>
              <div><strong>Horas contabilizadas</strong><span>{{ formatDuration(getWorkedSeconds(report)) }}</span></div>
              <button type="button" class="save-button" @click="openReportDetails(report)">Ver detalles</button>
            </div>
          </div>
          <div v-else class="report-editor">
            <div class="report-summary">
              <div>
                <strong v-if="reportsScope === 'all'">Asistente: {{ selectedReport.assistant_name || 'Sin nombre' }}</strong>
                <strong>Horas contabilizadas</strong>
                <span>{{ formatDuration(getWorkedSeconds(selectedReport)) }}</span>
              </div>
              <button type="button" class="delete-button" @click="deleteReport(selectedReport)">Borrar reporte</button>
            </div>
            <div class="report-details-grid">
              <label>Fecha y hora de inicio
                <input v-model="selectedReport.check_in" type="datetime-local" required />
              </label>
              <label>Fecha y hora de finalización
                <input v-model="selectedReport.check_out" type="datetime-local" />
              </label>
              <label>Estado
                <input :value="selectedReport.status_code" readonly />
              </label>
              <label>Proyecto
                <select v-model="selectedReport.project_id">
                  <option :value="null">Sin proyecto</option>
                  <option v-for="project in reportProjects" :key="project.id" :value="project.id">{{ project.name }}</option>
                </select>
              </label>
              <label>Encargado
                <select v-model="selectedReport.manager_user_id">
                  <option :value="null">Sin encargado</option>
                  <option v-for="manager in reportManagers" :key="manager.id" :value="manager.id">
                    {{ manager.full_name || manager.username }}
                  </option>
                </select>
              </label>
              <label>Minutos de almuerzo
                <input v-model.number="selectedReport.break_minutes" type="number" min="0" required />
              </label>
              <label class="full-width">Actividades realizadas
                <textarea v-model="selectedReport.activities" rows="3"></textarea>
              </label>
              <label class="full-width">Descripción del trabajo
                <textarea v-model="selectedReport.work_description" rows="3"></textarea>
              </label>
              <label class="full-width">Notas
                <textarea v-model="selectedReport.notes" rows="3"></textarea>
              </label>
            </div>
            <div class="report-detail-actions">
              <button type="button" class="secondary-button" @click="closeReportDetails">Volver a reportes</button>
              <button type="button" class="save-button" :disabled="reportSaving" @click="saveReport(selectedReport)">
              {{ reportSaving ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </div>
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
  <div
    v-if="reportSuccess"
    class="report-toast"
    :class="`report-toast-${reportToastType}`"
    role="status"
    aria-live="polite"
  >
    {{ reportSuccess }}
  </div>
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

.heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.eyebrow {
  margin: 0 0 .25rem;
  color: #0052a3;
  font-size: .8rem;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
}
h2 { margin: 0; color: #003d7a; }
.intro { margin: .5rem 0 0; color: #6b7280; }
.heading-actions { display: flex; gap: .75rem; flex-wrap: wrap; }
.primary-button, .secondary-heading-button {
  border: 0;
  border-radius: 7px;
  padding: .65rem 1rem;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}
.primary-button { background: #0052a3; color: #fff; }
.secondary-heading-button { background: #64748b; color: #fff; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 4px 14px #00000012; }
.state { padding: 2rem; color: #6b7280; text-align: center; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 780px; }
th, td { padding: 1rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
th { background: #f8fafc; color: #003d7a; }
.status { display: inline-block; border-radius: 999px; padding: .25rem .65rem; font-size: .8rem; font-weight: 700; }
.active { background: #dcfce7; color: #166534; }
.inactive { background: #fee2e2; color: #991b1b; }
.actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.actions button {
  border: 0;
  border-radius: 6px;
  padding: .55rem .75rem;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
}
.edit-button, .reports-button, .add-report-button { background: #0052a3; color: #fff; }
.add-report-button { background: #0f766e; }
.actions button:disabled { opacity: .65; cursor: wait; }
.actions .delete-button { background: #dc2626; color: #fff; }

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
.schedule-edit-row { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: .5rem; margin-bottom: .6rem; }
.report-editor { margin: 1rem 0; padding: 1rem; border: 1px solid var(--color-border); border-radius: 8px; }
.report-filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin: 1rem 0; }
.report-filters label { display: flex; flex-direction: column; gap: .35rem; color: #374151; font-weight: 600; }
.report-filters input { padding: .55rem; border: 1px solid var(--color-border); border-radius: 6px; font: inherit; }
.report-total { margin: 1rem 0; padding: 1rem; background: color-mix(in srgb, var(--color-primary) 8%, transparent); border-radius: 8px; }
.report-total strong { color: var(--color-primary); }
.report-toast {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 2000;
  max-width: min(420px, calc(100vw - 3rem));
  padding: .9rem 1.1rem;
  border-radius: 8px;
  color: white;
  box-shadow: 0 8px 24px #0000002e;
  font-weight: 600;
}
.report-toast-success { background: var(--color-success-dark); }
.report-toast-error { background: var(--color-error-dark); }
.report-preview-row { display: grid; grid-template-columns: 1.3fr 1.3fr 1fr auto; gap: 1rem; align-items: center; padding: .9rem 0; border-bottom: 1px solid var(--color-border); }
.all-reports-preview-row { grid-template-columns: 1.2fr 1.3fr 1.3fr 1fr auto; }
.report-preview-row div { display: flex; flex-direction: column; gap: .3rem; }
.report-preview-row strong { color: #6b7280; font-size: .8rem; }
.report-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.report-summary div { display: flex; flex-direction: column; gap: .3rem; }
.report-summary strong { color: #6b7280; font-size: .8rem; }
.report-details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem; }
.report-details-grid label { display: flex; flex-direction: column; gap: .4rem; font-weight: 600; }
.report-details-grid input, .report-details-grid select, .report-details-grid textarea {
  min-width: 0; padding: .55rem; border: 1px solid var(--color-border); border-radius: 6px; font: inherit;
}
.full-width { grid-column: 1 / -1; }
.report-detail-actions { display: flex; justify-content: flex-end; gap: .75rem; }
.secondary-button, .save-button, .delete-button { border: 0; border-radius: 6px; padding: .55rem .75rem; color: white; cursor: pointer; font: inherit; font-weight: 600; }
.secondary-button { background: #64748b; }
.save-button { background: #0052a3; }
.delete-button { background: #dc2626; }
@media (max-width: 800px) {
  .main-content { padding: 1.5rem 1rem; }
  .heading { align-items: flex-start; flex-direction: column; }
  .heading-actions { width: 100%; }
  .edit-grid, .schedule-edit-row, .report-details-grid, .report-preview-row, .all-reports-preview-row { grid-template-columns: 1fr; }
  .full-width { grid-column: auto; }
  .report-summary { align-items: flex-start; flex-direction: column; gap: .75rem; }
  .report-detail-actions { flex-direction: column-reverse; }
}
</style>
