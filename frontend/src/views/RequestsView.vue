<template>
  <div class="page">
    <AppHeader
      title="ProDUS"
      subtitle="Solicitudes"
      :user-role="getRoleLabel()"
      :user-name="userName || 'Usuario'"
      @logout="handleLogout"
    />
    <main class="content">
      <button class="back" type="button" @click="router.push('/home')">Volver al inicio</button>
      <div class="page-heading">
        <div>
          <h1>{{ isAdmin ? 'Notificaciones de solicitudes' : 'Mis solicitudes' }}</h1>
          <p>{{ isAdmin ? 'Atiende la cola asignada a tu cuenta.' : 'Envía y consulta tus solicitudes de cambio.' }}</p>
        </div>
        <button v-if="!isAdmin" class="primary" type="button" @click="showForm = !showForm">
          {{ showForm ? 'Cerrar formulario' : 'Nueva solicitud' }}
        </button>
      </div>

      <form v-if="!isAdmin && showForm" class="card request-form" @submit.prevent="submitRequest">
        <h2>Generar ticket</h2>
        <label>
          Administrador
          <select v-model="form.admin" required>
            <option value="" disabled>Selecciona un administrador</option>
            <option v-for="admin in admins" :key="admin.id" :value="admin.id">
              {{ admin.full_name || admin.username }}
            </option>
          </select>
        </label>
        <label>
          Tipo de solicitud
          <select v-model="form.request_type" required>
            <option value="horario">Cambio de horario</option>
            <option value="reporte">Cambio en reporte</option>
          </select>
        </label>
        <label v-if="form.request_type === 'reporte'">
          Reporte relacionado
          <select v-model="form.report" required>
            <option value="" disabled>Selecciona un reporte</option>
            <option v-for="report in reports" :key="report.id" :value="report.id">
              {{ formatReportOption(report) }}
            </option>
          </select>
        </label>
        <label>
          Describe el cambio requerido
          <textarea v-model="form.message" rows="5" required minlength="1" />
        </label>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <button class="primary" type="submit" :disabled="saving">
          {{ saving ? 'Enviando...' : 'Enviar solicitud' }}
        </button>
      </form>

      <section class="card">
        <div class="tabs">
          <button :class="{ selected: !showAttended }" type="button" @click="loadRequests(false)">No atendidas</button>
          <button :class="{ selected: showAttended }" type="button" @click="loadRequests(true)">Atendidas</button>
        </div>
        <div v-if="loading" class="empty">Cargando solicitudes...</div>
        <div v-else-if="requests.length === 0" class="empty">No hay solicitudes en esta sección.</div>
        <div v-else class="request-list">
          <article v-for="item in requests" :key="item.id" class="request-row">
            <div>
              <strong>{{ item.request_type_label }}</strong>
              <span>{{ isAdmin ? item.assistant_name : `Para: ${item.admin_name}` }}</span>
              <small>{{ formatDate(item.created_at) }}</small>
            </div>
            <span :class="['status', item.is_attended ? 'done' : 'pending']">
              {{ item.is_attended ? 'Atendido' : 'Pendiente' }}
            </span>
            <div class="row-actions">
              <button v-if="isAdmin && !item.is_attended" class="attend" type="button" @click="attendRequest(item)">
                Atender
              </button>
              <button class="secondary" type="button" @click="openDetails(item)">Ver detalles</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <div v-if="selectedRequest" class="modal-backdrop" @click.self="selectedRequest = null">
      <section class="modal card">
        <button class="close" type="button" aria-label="Cerrar" @click="selectedRequest = null">×</button>
        <h2>Detalle de solicitud</h2>
        <dl>
          <dt>Asistente</dt><dd>{{ selectedRequest.assistant_name }}</dd>
          <dt>Tipo</dt><dd>{{ selectedRequest.request_type_label }}</dd>
          <dt>Fecha de creación</dt><dd>{{ formatDate(selectedRequest.created_at) }}</dd>
          <dt>Estado</dt><dd>{{ selectedRequest.is_attended ? 'Atendido' : 'Pendiente' }}</dd>
          <template v-if="selectedRequest.report_summary">
          <dt>Reporte relacionado</dt>
          <dd>{{ formatReportOption(selectedRequest.report_summary) }}</dd>
          </template>
          <dt>Mensaje</dt><dd class="message">{{ selectedRequest.message }}</dd>
        </dl>
        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
        <button
          v-if="isAdmin && !selectedRequest.is_attended"
          class="primary"
          type="button"
          :disabled="saving"
          @click="markAttended"
        >
          {{ saving ? 'Guardando...' : 'Marcar como atendido' }}
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import { ROLES } from '@/config/roles'
import api, { type RequestAdminOption, type TimeLogSession, type UserRequest } from '@/services/api'

const router = useRouter()
const { userRole, userName, logout } = useAuth()
const isAdmin = computed(() => userRole.value === 'admin')
const admins = ref<RequestAdminOption[]>([])
const reports = ref<TimeLogSession[]>([])
const requests = ref<UserRequest[]>([])
const selectedRequest = ref<UserRequest | null>(null)
const showAttended = ref(false)
const showForm = ref(true)
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive<{ admin: number | ''; request_type: UserRequest['request_type']; report: number | ''; message: string }>({
  admin: '',
  request_type: 'horario',
  report: '',
  message: '',
})

const getRoleLabel = () => userRole.value ? ROLES[userRole.value]?.label || userRole.value : 'Usuario'
const formatDate = (value: string) => new Date(value).toLocaleString('es-CR')
const formatReportOption = (report: { id: number; check_in: string; check_out: string | null; project_name?: string | null }) =>
  `${formatDate(report.check_in)}${report.project_name ? ` - ${report.project_name}` : ''}`

watch(
  () => form.request_type,
  (requestType) => {
    if (requestType === 'horario') {
      form.report = ''
    }
  },
)

const loadRequests = async (attended: boolean) => {
  showAttended.value = attended
  loading.value = true
  errorMessage.value = ''
  try {
    requests.value = await api.listRequests(attended)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar las solicitudes.'
  } finally {
    loading.value = false
  }
}

const openDetails = (item: UserRequest) => {
  selectedRequest.value = item
  errorMessage.value = ''
}

const submitRequest = async () => {
  if (form.admin === '') return
  saving.value = true
  errorMessage.value = ''
  try {
    const payload: {
      admin: number
      request_type: UserRequest['request_type']
      message: string
      report?: number
    } = {
      admin: form.admin,
      request_type: form.request_type,
      message: form.message,
    }
    if (form.request_type === 'reporte' && form.report !== '') {
      payload.report = form.report
    }
    await api.createRequest(payload)
    form.message = ''
    form.report = ''
    showForm.value = false
    await loadRequests(false)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo enviar la solicitud.'
  } finally {
    saving.value = false
  }
}

const markAttended = async () => {
  if (!selectedRequest.value) return
  saving.value = true
  errorMessage.value = ''
  try {
    const updated = await api.markRequestAttended(selectedRequest.value.id)
    selectedRequest.value = updated
    await loadRequests(showAttended.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo marcar la solicitud.'
  } finally {
    saving.value = false
  }
}

const attendRequest = (item: UserRequest) => {
  if (item.request_type === 'horario') {
    router.push({ path: '/gestionar-asistentes', query: { editAssistant: String(item.assistant) } })
    return
  }
  if (item.report) {
    router.push({
      path: '/gestionar-asistentes',
      query: { editAssistant: String(item.assistant), editReport: String(item.report) },
    })
  }
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

onMounted(async () => {
  if (!isAdmin.value) {
    try {
      const [availableAdmins, ownReports] = await Promise.all([
        api.listRequestAdmins(),
        api.getWorkSessionReports(),
      ])
      admins.value = availableAdmins
      reports.value = ownReports.results
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar los administradores.'
    }
  }
  await loadRequests(false)
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f1f5f9; color: #1e293b; }
.content { max-width: 1100px; margin: 0 auto; padding: 2rem; }
.back { margin-bottom: 1.5rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: .6rem 1rem; background: white; color: #003d7a; cursor: pointer; }
.page-heading { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
h1 { color: #003d7a; margin: 0 0 .35rem; } h2 { color: #003d7a; margin-top: 0; }
.card { background: #fff; border-radius: 12px; padding: 1.25rem; box-shadow: 0 2px 10px #0f172a12; margin-bottom: 1.5rem; }
.request-form { display: grid; gap: 1rem; max-width: 720px; }
label { display: grid; gap: .4rem; font-weight: 600; color: #334155; }
select, textarea { border: 1px solid #cbd5e1; border-radius: 7px; padding: .65rem; font: inherit; }
button { border: 0; border-radius: 7px; padding: .65rem 1rem; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .6; cursor: not-allowed; }
.primary { background: #0052a3; color: white; } .secondary { background: #e2e8f0; color: #1e3a5f; }
.attend { background: #16a34a; color: white; } .row-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.tabs { display: flex; gap: .5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; }
.tabs button { background: transparent; color: #64748b; border-radius: 0; } .tabs .selected { color: #0052a3; border-bottom: 3px solid #0052a3; }
.request-list { display: grid; gap: .75rem; } .request-row { display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; align-items: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
.request-row div { display: grid; gap: .25rem; } .request-row span, small { color: #64748b; }
.status { border-radius: 999px; padding: .3rem .65rem; font-size: .8rem; font-weight: 700; } .status.done { background: #dcfce7; color: #166534; } .status.pending { background: #fef3c7; color: #92400e; }
.empty { color: #64748b; text-align: center; padding: 1.5rem; } .error { color: #b91c1c; white-space: pre-line; }
.modal-backdrop { position: fixed; inset: 0; background: #0f172a99; display: grid; place-items: center; padding: 1rem; z-index: 10; }
.modal { width: min(560px, 100%); position: relative; } .close { position: absolute; right: 1rem; top: .8rem; background: transparent; font-size: 1.5rem; padding: .2rem .5rem; }
dl { display: grid; grid-template-columns: 150px 1fr; gap: .75rem; } dt { font-weight: 700; color: #475569; } dd { margin: 0; } .message { white-space: pre-wrap; }
@media (max-width: 700px) { .page-heading, .request-row { display: flex; flex-direction: column; align-items: stretch; } .status { align-self: flex-start; } dl { grid-template-columns: 1fr; gap: .25rem; } dd { margin-bottom: .5rem; } }
</style>
