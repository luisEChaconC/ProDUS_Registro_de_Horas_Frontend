<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { ROLES } from '@/config/roles'
import AppHeader from '@/components/AppHeader.vue'
import WelcomeBanner from '@/components/WelcomeBanner.vue'
import MenuButton from '@/components/MenuButton.vue'
import InfoCard from '@/components/InfoCard.vue'
import api from '@/services/api'

const router = useRouter()
const { userRole, userName, logout } = useAuth()
const assistantsCount = ref(0)

const loadAssistants = async () => {
  try {
    const response = await api.listAssistants()
    assistantsCount.value = response.results.length
  } catch (error) {
    assistantsCount.value = 0
    console.warn('No se pudo cargar la lista de asistentes:', error)
  }
}

watch(
  () => userRole.value,
  (role) => {
    if (role === 'coordinador' || role === 'admin') {
      loadAssistants()
      return
    }

    assistantsCount.value = 0
  },
  { immediate: true }
)

// Opciones de menú según el rol
const menuOptions = computed(() => {
  const commonOptions = [
    { label: 'Registro de Horas', path: '/registro-horas' }
  ]

  const roleMenus = {
    asistente: [
      ...commonOptions,
      { label: 'Mis Horarios', path: '/horarios' },
      { label: 'Mis Reportes', path: '/reportes' }
    ],
    coordinador: [
      ...commonOptions,
      { label: 'Gestionar Equipo', path: '/equipo' },
      { label: 'Reportes del Proyecto', path: '/reportes-proyecto' },
      { label: 'Horarios Equipo', path: '/horarios-equipo' }
    ],
    admin: [
      ...commonOptions,
      { label: 'Gestionar Usuarios', path: '/usuarios' },
      { label: 'Configuración Sistema', path: '/configuracion' },
      { label: 'Reportes Globales', path: '/reportes-globales' },
      { label: 'Rangos IP Permitidos', path: '/rangos-ip' }
    ]
  }

  const role = userRole.value as keyof typeof roleMenus
  return roleMenus[role] || commonOptions
})

const getRoleLabel = (): string => {
  if (!userRole.value) return 'Usuario'
  return ROLES[userRole.value]?.label || 'Usuario'
}

const navigateTo = (path: string) => {
  router.push(path)
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <!-- Header -->
    <AppHeader 
      title="ProDUS" 
      subtitle="Registro de Horas"
      :user-role="getRoleLabel()"
      :user-name="userName || 'Usuario'"
      @logout="handleLogout"
    />

    <!-- Contenido principal -->
    <div class="main-content">
      <!-- Banner de bienvenida -->
      <WelcomeBanner 
        :title="`Bienvenido, ${userName || 'Usuario'}`"
        :subtitle="`Acceso rápido a tus herramientas de ${getRoleLabel().toLowerCase()}`"
      />

      <!-- Grid de opciones según rol -->
      <section class="menu-grid">
        <h3 class="section-title">Acciones Disponibles</h3>
        <div class="options-container">
          <MenuButton 
            v-for="option in menuOptions" 
            :key="option.path"
            :label="option.label"
            @click="navigateTo(option.path)"
          />
          <MenuButton
            v-if="userRole === 'coordinador' || userRole === 'admin'"
            label="Gestionar Asistentes"
            @click="navigateTo('/gestionar-asistentes')"
          />
        </div>
      </section>

      <section class="info-section" v-if="userRole === 'asistente'">
        <h3 class="section-title">Tu Información</h3>
        <div class="info-cards">
          <InfoCard label="Horas Registradas" value="0" />
          <InfoCard label="Pendiente de Valoración" value="0" />
        </div>
      </section>

      <section class="info-section" v-if="userRole === 'coordinador'">
        <h3 class="section-title">Información del Coordinador</h3>
        <div class="info-cards">
          <InfoCard label="Asistentes a Cargo" :value="String(assistantsCount)" />
          <InfoCard label="Reportes Pendientes" value="0" />
        </div>
      </section>

      <section class="info-section" v-if="userRole === 'admin'">
        <h3 class="section-title">Información del Sistema</h3>
        <div class="info-cards">
          <InfoCard label="Usuarios Activos" value="0" />
          <InfoCard label="Proyectos" value="0" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.menu-grid {
  margin-bottom: 3rem;
}

.current-role {
  margin: 0.75rem 0 1.5rem;
  color: #003d7a;
  font-size: 0.95rem;
}

.section-title {
  font-size: 1.5rem;
  color: #003d7a;
  margin-bottom: 1.5rem;
  font-weight: 600;
}

.options-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.info-section {
  margin-bottom: 3rem;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .main-content {
    padding: 1.5rem 1rem;
  }

  .options-container {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }
}
</style>
