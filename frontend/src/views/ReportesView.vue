<template>
  <div class="page">
    <AppHeader title="ProDUS" subtitle="Mis Reportes" :user-role="roleLabel" :user-name="userName || 'Usuario'" @logout="handleLogout" />
    <main class="content">
      <button class="back" type="button" @click="router.push('/home')">Volver al inicio</button>
      <h2>Mis reportes de horas</h2>
      <div class="filters">
        <label>Desde <input v-model="startDate" type="date" /></label>
        <label>Hasta <input v-model="endDate" type="date" /></label>
        <button type="button" :disabled="loading" @click="loadReports">Consultar</button>
        <button type="button" :disabled="loading || !reports.length" @click="exportReports">
          Exportar CSV
        </button>
      </div>
      <section class="summary">Total de horas registradas en el periodo seleccionado: <strong>{{ formatDuration(totalSeconds) }}</strong></section>
      <section v-if="loading" class="card">Cargando reportes...</section>
      <section v-else-if="reports.length" class="card">
        <div v-for="report in reports" :key="report.id" class="report-row">
          <div><strong>Inicio</strong><span>{{ formatDate(report.check_in) }}</span></div>
          <div><strong>Finalización</strong><span>{{ formatDate(report.check_out) }}</span></div>
          <div><strong>Horas contabilizadas</strong><span>{{ formatDuration(getWorkedSeconds(report)) }}</span></div>
          <button type="button" @click="openDetails(report)">Ver detalles</button>
        </div>
      </section>
      <section v-else class="card empty">No hay jornadas cerradas en el periodo seleccionado.</section>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </main>

    <div v-if="selectedReport" class="modal-overlay" @click.self="closeDetails">
      <section class="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <div class="modal-heading">
          <h3 id="details-title">Detalles del reporte</h3>
          <button class="close-button" type="button" aria-label="Cerrar detalles" @click="closeDetails">×</button>
        </div>
        <div class="details-grid">
          <div><strong>Fecha y hora de inicio</strong><span>{{ formatDate(selectedReport.check_in) }}</span></div>
          <div><strong>Fecha y hora de finalización</strong><span>{{ formatDate(selectedReport.check_out) }}</span></div>
          <div><strong>Horas contabilizadas</strong><span>{{ formatDuration(getWorkedSeconds(selectedReport)) }}</span></div>
          <div><strong>Proyecto</strong><span>{{ selectedReport.project_name || 'Sin proyecto' }}</span></div>
          <div><strong>Encargado</strong><span>{{ selectedReport.manager_name || 'Sin encargado' }}</span></div>
          <div><strong>Minutos de almuerzo</strong><span>{{ selectedReport.break_minutes }}</span></div>
          <div class="full-width"><strong>Actividades realizadas</strong><span>{{ selectedReport.activities || selectedReport.work_description || 'Sin actividades registradas' }}</span></div>
          <div class="full-width"><strong>Notas</strong><span>{{ selectedReport.notes || 'Sin notas' }}</span></div>
        </div>
        <button class="modal-close-button" type="button" @click="closeDetails">Cerrar</button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import api, { type TimeLogSession } from '@/services/api'

const router = useRouter()
const { userName, userRole, logout } = useAuth()
const reports = ref<TimeLogSession[]>([])
const totalSeconds = ref(0)
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const errorMessage = ref('')
const selectedReport = ref<TimeLogSession | null>(null)
const roleLabel = computed(() => userRole.value || 'Usuario')

function formatDate(value: string | null) {
  if (!value) return 'Pendiente'
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function getWorkedSeconds(report: TimeLogSession) {
  return Math.max(0, report.elapsed_seconds - report.break_minutes * 60)
}

function formatDuration(seconds: number) {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  return `${Math.floor(totalMinutes / 60)} h ${totalMinutes % 60} min`
}

function csvValue(value: string | number | null) {
  const text = value === null ? '' : String(value)
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
}

function exportReports() {
  if (!reports.value.length) return
  const headers = [
    'Inicio',
    'Finalización',
    'Horas contabilizadas',
    'Proyecto',
    'Encargado',
    'Minutos de almuerzo',
    'Actividades realizadas',
    'Descripción del trabajo',
    'Notas',
  ]
  const rows = reports.value.map((report) => [
    formatDate(report.check_in),
    formatDate(report.check_out),
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
  link.download = `mis-reportes-${startDate.value || 'todos'}-${endDate.value || 'todos'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function openDetails(report: TimeLogSession) {
  selectedReport.value = report
}

function closeDetails() {
  selectedReport.value = null
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function setCurrentWeek() {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysSinceMonday)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  startDate.value = formatInputDate(weekStart)
  endDate.value = formatInputDate(weekEnd)
}

async function loadReports() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await api.getWorkSessionReports({ start_date: startDate.value || undefined, end_date: endDate.value || undefined })
    reports.value = response.results
    totalSeconds.value = response.total_seconds
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar los reportes.'
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  await logout()
  router.push('/login')
}

onMounted(() => {
  setCurrentWeek()
  void loadReports()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.content { max-width: 900px; margin: 0 auto; padding: 2rem; }
.back, .filters button { border: 1px solid #cbd5e1; border-radius: 6px; padding: .6rem 1rem; background: white; color: #003d7a; cursor: pointer; }
h2 { color: #003d7a; }
.filters { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin: 1.5rem 0; }
label { display: flex; flex-direction: column; gap: .35rem; color: #374151; font-weight: 600; }
input { padding: .55rem; border: 1px solid #cbd5e1; border-radius: 6px; }
.summary, .card { margin-top: 1rem; padding: 1.25rem; background: white; border-radius: 10px; box-shadow: 0 4px 14px #00000012; }
.summary strong { color: #0052a3; }
.report-row { display: grid; grid-template-columns: 1.3fr 1.3fr 1fr auto; gap: 1rem; align-items: center; padding: .9rem 0; border-bottom: 1px solid #e5e7eb; }
.report-row div, .details-grid div { display: flex; flex-direction: column; gap: .3rem; }
.report-row strong, .details-grid strong { color: #6b7280; font-size: .8rem; }
.report-row span { color: #374151; }
.report-row button, .modal-close-button { border: 0; border-radius: 6px; padding: .55rem .75rem; background: #0052a3; color: white; cursor: pointer; font: inherit; font-weight: 600; }
.empty, .error { color: #6b7280; }
.error { margin-top: 1rem; color: #b91c1c; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; background: #00000059; }
.details-modal { width: min(760px, 100%); max-height: 90vh; overflow: auto; padding: 1.5rem; background: white; border-radius: 10px; box-shadow: 0 8px 30px #0000002e; }
.modal-heading { display: flex; justify-content: space-between; align-items: center; }
.modal-heading h3 { margin: 0; color: #003d7a; }
.close-button { border: 0; background: transparent; color: #374151; font-size: 1.8rem; cursor: pointer; }
.details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin: 1.5rem 0; }
.full-width { grid-column: 1 / -1; }
.modal-close-button { display: block; margin-left: auto; background: #64748b; }
@media (max-width: 700px) {
  .report-row, .details-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: auto; }
}
</style>
