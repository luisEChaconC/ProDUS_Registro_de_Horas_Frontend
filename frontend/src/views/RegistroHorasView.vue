<template>
  <div class="page">
    <AppHeader title="ProDUS" subtitle="Registro de Horas" :user-role="getRoleLabel()" :user-name="userName || 'Usuario'" @logout="handleLogout" />
    <main class="content">
      <div class="heading">
        <div>
          <p class="eyebrow">Control de jornada</p>
          <h2>Registro de horas</h2>
          <p class="intro">Inicia tu jornada al comenzar y completa la información al finalizar.</p>
        </div>
        <button class="back-button" type="button" @click="router.push('/home')">Volver al inicio</button>
      </div>

      <section v-if="loading" class="card loading">Consultando tu jornada...</section>
      <section v-else class="card">
        <div class="status-row">
          <div>
            <span class="status-label">Estado actual</span>
            <strong :class="['status', activeSession ? 'active' : 'inactive']">{{ activeSession ? 'Jornada activa' : 'Sin jornada activa' }}</strong>
          </div>
          <div v-if="activeSession" class="elapsed">
            <span>Tiempo transcurrido</span>
            <strong>{{ formattedElapsed }}</strong>
          </div>
        </div>

        <div v-if="activeSession && session" class="session-info">
          <span>Entrada registrada</span>
          <strong>{{ formatDate(session.check_in) }}</strong>
        </div>

        <div v-if="!activeSession" class="start-area">
          <p>Registra tu entrada desde una red autorizada.</p>
          <button class="primary-button" type="button" :disabled="actionLoading" @click="startSession">{{ actionLoading ? 'Iniciando...' : 'Iniciar jornada' }}</button>
        </div>

        <form v-else class="close-form" @submit.prevent="closeSession">
          <h3>Finalizar jornada</h3>
          <div class="form-grid">
            <label>Proyecto
              <select v-model="closeForm.project_id">
                <option value="">Sin proyecto</option>
                <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
              </select>
            </label>
            <label>Encargado
              <select v-model="closeForm.manager_user_id">
                <option value="">Sin encargado</option>
                <option v-for="coordinator in coordinators" :key="coordinator.id" :value="coordinator.id">{{ coordinator.full_name || coordinator.username }}</option>
              </select>
            </label>
            <label class="full-width">Actividades realizadas
              <textarea v-model="closeForm.activities" rows="4" placeholder="Describe brevemente tu trabajo"></textarea>
            </label>
            <label>Minutos de almuerzo
              <input v-model.number="closeForm.break_minutes" type="number" min="0" step="1" />
            </label>
            <label>Notas
              <input v-model="closeForm.notes" maxlength="500" placeholder="Opcional" />
            </label>
          </div>
          <button class="danger-button" type="submit" :disabled="actionLoading">{{ actionLoading ? 'Cerrando...' : 'Finalizar y guardar jornada' }}</button>
        </form>
      </section>
      <p v-if="errorMessage" class="error-message" role="alert">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-message" role="status">{{ successMessage }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import { ROLES } from '@/config/roles'
import api, { type CoordinatorOption, type ProjectOption, type TimeLogSession } from '@/services/api'

const router = useRouter()
const { userRole, userName, logout } = useAuth()
const loading = ref(true)
const actionLoading = ref(false)
const activeSession = ref(false)
const session = ref<TimeLogSession | null>(null)
const elapsedSeconds = ref(0)
const projects = ref<ProjectOption[]>([])
const coordinators = ref<CoordinatorOption[]>([])
const errorMessage = ref('')
const successMessage = ref('')
const closeForm = reactive({
  project_id: '' as number | '',
  manager_user_id: '' as number | '',
  notes: '',
  activities: '',
  break_minutes: 0,
})
let timer: ReturnType<typeof setInterval> | undefined

const formattedElapsed = computed(() => {
  const hours = Math.floor(elapsedSeconds.value / 3600).toString().padStart(2, '0')
  const minutes = Math.floor((elapsedSeconds.value % 3600) / 60).toString().padStart(2, '0')
  const seconds = (elapsedSeconds.value % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

function getRoleLabel() {
  return userRole.value ? ROLES[userRole.value]?.label || 'Usuario' : 'Usuario'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function showError(error: unknown) {
  errorMessage.value = error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

function startTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(() => { elapsedSeconds.value += 1 }, 1000)
}

async function loadSession() {
  try {
    const response = await api.getCurrentWorkSession()
    activeSession.value = response.active_session
    session.value = response.session
    elapsedSeconds.value = response.elapsed_seconds || response.session?.elapsed_seconds || 0
    if (activeSession.value) startTimer()
  } catch (error) {
    showError(error)
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  try {
    const [projectResponse, coordinatorResponse] = await Promise.all([api.getActiveProjects(), api.getActiveCoordinators()])
    projects.value = projectResponse.results
    coordinators.value = coordinatorResponse.results
  } catch (error) {
    showError(error)
  }
}

async function startSession() {
  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const response = await api.startWorkSession()
    activeSession.value = true
    session.value = response.session
    elapsedSeconds.value = response.session.elapsed_seconds
    startTimer()
    successMessage.value = 'Jornada iniciada correctamente.'
  } catch (error) {
    showError(error)
  } finally {
    actionLoading.value = false
  }
}

async function closeSession() {
  actionLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await api.closeWorkSession({
      project_id: closeForm.project_id === '' ? null : closeForm.project_id,
      manager_user_id: closeForm.manager_user_id === '' ? null : closeForm.manager_user_id,
      notes: closeForm.notes,
      activities: closeForm.activities,
      break_minutes: closeForm.break_minutes,
    })
    activeSession.value = false
    session.value = null
    elapsedSeconds.value = 0
    if (timer) clearInterval(timer)
    successMessage.value = 'Jornada finalizada y guardada correctamente.'
    closeForm.project_id = ''
    closeForm.manager_user_id = ''
    closeForm.notes = ''
    closeForm.activities = ''
    closeForm.break_minutes = 0
  } catch (error) {
    showError(error)
  } finally {
    actionLoading.value = false
  }
}

async function handleLogout() {
  await logout()
  router.push('/login')
}

onMounted(() => {
  void loadSession()
  void loadOptions()
})

onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.content { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem; }
.heading { display: flex; justify-content: space-between; gap: 1rem; align-items: flex-start; margin-bottom: 1.5rem; }
.eyebrow { margin: 0 0 .25rem; color: #0052a3; font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h2 { margin: 0; color: #003d7a; font-size: 2rem; }
.intro { margin: .5rem 0 0; color: #6b7280; }
.card { padding: 2rem; background: #fff; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.08); }
.loading { color: #6b7280; text-align: center; }
.status-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
.status-label, .elapsed span, .session-info span { display: block; color: #6b7280; font-size: .85rem; }
.status { display: block; margin-top: .25rem; font-size: 1.35rem; }
.status.active { color: #059669; }
.status.inactive { color: #374151; }
.elapsed { text-align: right; }
.elapsed strong { display: block; margin-top: .25rem; color: #003d7a; font-size: 1.7rem; font-variant-numeric: tabular-nums; }
.session-info { margin-top: 1.5rem; padding: 1rem; border-left: 4px solid #10b981; background: #f0fdf4; }
.session-info strong { display: block; margin-top: .25rem; }
.start-area { margin-top: 2rem; text-align: center; }
.close-form { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }
h3 { margin: 0 0 1rem; color: #003d7a; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
label { display: flex; flex-direction: column; gap: .4rem; color: #374151; font-weight: 600; font-size: .9rem; }
input, select, textarea { width: 100%; padding: .7rem; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #1f2937; font: inherit; }
textarea { resize: vertical; }
.full-width { grid-column: 1 / -1; }
button { border: 0; border-radius: 7px; padding: .75rem 1.25rem; font: inherit; font-weight: 700; cursor: pointer; }
.primary-button { background: #0052a3; color: #fff; }
.danger-button { background: #dc2626; color: #fff; }
.back-button { border: 1px solid #cbd5e1; background: #fff; color: #003d7a; }
button:disabled { cursor: not-allowed; opacity: .6; }
.error-message, .success-message { margin: 1rem 0 0; padding: .9rem 1rem; border-radius: 6px; }
.error-message { background: #fef2f2; color: #b91c1c; }
.success-message { background: #ecfdf5; color: #047857; }
@media (max-width: 650px) {
  .content { padding: 1.5rem 1rem; }
  .heading, .status-row { flex-direction: column; }
  .elapsed { text-align: left; }
  .form-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: auto; }
  .back-button { width: 100%; }
}
</style>
