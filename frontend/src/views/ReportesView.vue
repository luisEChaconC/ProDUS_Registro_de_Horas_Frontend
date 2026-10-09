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
      </div>
      <section class="summary">Total del periodo: <strong>{{ (totalSeconds / 3600).toFixed(2) }} horas</strong></section>
      <section v-if="loading" class="card">Cargando reportes...</section>
      <section v-else-if="reports.length" class="card">
        <div v-for="report in reports" :key="report.id" class="report-row">
          <strong>{{ formatDate(report.check_in) }}</strong>
          <span>{{ report.elapsed_seconds ? (Math.max(0, report.elapsed_seconds - report.break_minutes * 60) / 3600).toFixed(2) : '0.00' }} h</span>
          <small>{{ report.status_code }}</small>
        </div>
      </section>
      <section v-else class="card empty">No hay jornadas cerradas en el periodo seleccionado.</section>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </main>
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
const roleLabel = computed(() => userRole.value || 'Usuario')

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
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

onMounted(() => { void loadReports() })
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
.report-row { display: grid; grid-template-columns: 1fr auto auto; gap: 1rem; padding: .9rem 0; border-bottom: 1px solid #e5e7eb; }
.report-row span { color: #0052a3; font-weight: 700; }
.report-row small { color: #6b7280; }
.empty, .error { color: #6b7280; }
.error { margin-top: 1rem; color: #b91c1c; }
</style>
