<template>
  <div class="page">
    <AppHeader title="ProDUS" subtitle="Mis Horarios" :user-role="roleLabel" :user-name="userName || 'Usuario'" @logout="handleLogout" />
    <main class="content">
      <button class="back" type="button" @click="router.push('/home')">Volver al inicio</button>
      <h2>Mi horario</h2>
      <p v-if="loading">Cargando horario...</p>
      <section v-else-if="schedule" class="card">
        <p class="validity">Vigente desde {{ schedule.valid_from }}{{ schedule.valid_to ? ` hasta ${schedule.valid_to}` : '' }}</p>
        <div v-for="day in days" :key="day.code" class="day-row">
          <strong>{{ day.label }}</strong>
          <span v-if="blocksFor(day.code).length">
            {{ blocksFor(day.code).map(block => `${block.start_time.slice(0, 5)} - ${block.end_time.slice(0, 5)}`).join(', ') }}
          </span>
          <span v-else class="muted">Sin horario</span>
        </div>
      </section>
      <section v-else class="card empty">No tienes un horario asignado actualmente.</section>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import api, { type MyScheduleResponse, type ScheduleBlock } from '@/services/api'

const router = useRouter()
const { userName, userRole, logout } = useAuth()
const schedule = ref<MyScheduleResponse['schedule']>(null)
const loading = ref(true)
const errorMessage = ref('')
const days = [
  { code: 'MONDAY', label: 'Lunes' }, { code: 'TUESDAY', label: 'Martes' },
  { code: 'WEDNESDAY', label: 'Miércoles' }, { code: 'THURSDAY', label: 'Jueves' },
  { code: 'FRIDAY', label: 'Viernes' }, { code: 'SATURDAY', label: 'Sábado' },
  { code: 'SUNDAY', label: 'Domingo' },
]
const roleLabel = computed(() => userRole.value || 'Usuario')
const blocksFor = (code: string): ScheduleBlock[] => schedule.value?.blocks.filter(block => block.day_of_week === code) || []

onMounted(async () => {
  try {
    schedule.value = (await api.getMySchedule()).schedule
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo cargar el horario.'
  } finally {
    loading.value = false
  }
})

async function handleLogout() {
  await logout()
  router.push('/login')
}
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.content { max-width: 850px; margin: 0 auto; padding: 2rem; }
.back { margin-bottom: 1.5rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: .6rem 1rem; background: white; color: #003d7a; cursor: pointer; }
h2 { color: #003d7a; }
.card { padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 14px #00000012; }
.validity { color: #6b7280; }
.day-row { display: grid; grid-template-columns: 180px 1fr; gap: 1rem; padding: .9rem 0; border-bottom: 1px solid #e5e7eb; }
.muted { color: #9ca3af; }
.empty { color: #6b7280; }
.error { color: #b91c1c; }
@media (max-width: 600px) { .day-row { grid-template-columns: 1fr; gap: .25rem; } }
</style>
