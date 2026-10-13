<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import GenericForm from '@/components/GenericForm.vue'
import { useAuth } from '@/composables/useAuth'
import api, { type ProjectAdminItem } from '@/services/api'

const router = useRouter()
const { userName, userRole, logout } = useAuth()
const projects = ref<ProjectAdminItem[]>([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const showInactive = ref(false)
const showModal = ref(false)
const editingProject = ref<ProjectAdminItem | null>(null)
const formInitialValues = ref<Record<string, unknown>>({})

const projectFields = [
  { name: 'name', label: 'Nombre del proyecto', type: 'text', placeholder: 'Ej: Actualización del plan regulador', required: true, order: 1, span: 2 },
  { name: 'is_active', label: 'Proyecto activo', type: 'checkbox', defaultValue: true, order: 2, span: 2 },
]

const loadProjects = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    projects.value = (await api.listAdminProjects(showInactive.value)).results
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar los proyectos.'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingProject.value = null
  formInitialValues.value = { name: '', is_active: true }
  showModal.value = true
}

const openEdit = (project: ProjectAdminItem) => {
  editingProject.value = project
  formInitialValues.value = { name: project.name, is_active: project.is_active }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingProject.value = null
}

const saveProject = async (values: Record<string, unknown>) => {
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const payload = { name: String(values.name || '').trim(), is_active: Boolean(values.is_active) }
    if (editingProject.value) {
      await api.updateProject(editingProject.value.id, payload)
      successMessage.value = 'Proyecto actualizado correctamente.'
    } else {
      await api.createProject(payload)
      successMessage.value = 'Proyecto creado correctamente.'
    }
    closeModal()
    await loadProjects()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo guardar el proyecto.'
  }
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

onMounted(() => { void loadProjects() })
</script>

<template>
  <div class="page">
    <AppHeader title="ProDUS" subtitle="Gestión de Proyectos" :user-role="userRole || 'Administrador'" :user-name="userName || 'Usuario'" @logout="handleLogout" />
    <main class="content">
      <button class="back-button" type="button" @click="router.push('/home')">Volver al inicio</button>
      <div class="heading">
        <div>
          <p class="eyebrow">Administración</p>
          <h2>Proyectos del sistema</h2>
          <p class="intro">Administra los proyectos disponibles para el registro de horas.</p>
        </div>
        <button class="primary-button" type="button" @click="openCreate">Añadir proyecto</button>
      </div>
      <div class="filter-card">
        <label class="filter-label">
          <input v-model="showInactive" type="checkbox" @change="loadProjects">
          Mostrar también proyectos inactivos
        </label>
      </div>
      <section v-if="errorMessage" class="message error" role="alert">{{ errorMessage }}</section>
      <section v-if="successMessage" class="message success" role="status">{{ successMessage }}</section>
      <section v-if="loading" class="card state">Cargando proyectos...</section>
      <section v-else-if="projects.length === 0" class="card state">
        {{ showInactive ? 'No hay proyectos registrados.' : 'No hay proyectos activos.' }}
      </section>
      <section v-else class="card table-wrapper">
        <table>
          <thead><tr><th>Nombre</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            <tr v-for="project in projects" :key="project.id">
              <td>{{ project.name }}</td>
              <td><span :class="['status', project.is_active ? 'active' : 'inactive']">{{ project.is_active ? 'Activo' : 'Inactivo' }}</span></td>
              <td class="actions"><button class="edit-button" type="button" @click="openEdit(project)">Editar</button></td>
            </tr>
          </tbody>
        </table>
      </section>
      <div v-if="showModal" class="modal-overlay">
        <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
          <div class="modal-heading">
            <h3 id="project-modal-title">{{ editingProject ? 'Editar proyecto' : 'Nuevo proyecto' }}</h3>
          </div>
          <GenericForm
            :title="editingProject ? 'Editar proyecto' : 'Nuevo proyecto'"
            :fields="projectFields"
            :initial-values="formInitialValues"
            confirm-text="Guardar"
            cancel-text="Cancelar"
            @confirm="saveProject"
            @cancel="closeModal"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.page{min-height:100vh;background:#f5f5f5}.content{max-width:1150px;margin:0 auto;padding:2rem}.back-button,.primary-button{border:1px solid #cbd5e1;border-radius:7px;padding:.65rem 1rem;cursor:pointer;font:inherit;font-weight:600}.back-button{margin-bottom:1.5rem;background:#fff;color:#003d7a}.primary-button{background:#0052a3;color:#fff}.heading{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1.5rem}.eyebrow{margin:0 0 .25rem;color:#0052a3;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h2{margin:0;color:#003d7a}.intro{margin:.5rem 0 0;color:#6b7280}.filter-card,.card{background:#fff;border-radius:12px;box-shadow:0 4px 14px #00000012}.filter-card{margin-bottom:1rem;padding:1rem}.filter-label{display:flex;align-items:center;gap:.6rem;color:#374151;font-weight:600}.filter-label input{width:1rem;height:1rem}.state{padding:2rem;color:#6b7280;text-align:center}.table-wrapper{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:500px}th,td{padding:1rem;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;color:#003d7a}.status{display:inline-block;border-radius:999px;padding:.25rem .65rem;font-size:.8rem;font-weight:700}.active{background:#dcfce7;color:#166534}.inactive{background:#fee2e2;color:#991b1b}.actions{display:flex;gap:.5rem}.actions button{border:0;border-radius:6px;padding:.55rem .75rem;cursor:pointer;font:inherit;font-weight:600}.edit-button{background:#0052a3;color:#fff}.message{margin-bottom:1rem;padding:1rem;border-radius:7px}.error{background:#fef2f2;color:#b91c1c}.success{background:#ecfdf5;color:#047857}.modal-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;background:#00000059}.modal-card{width:min(650px,100%);padding:1.5rem;background:#fff;border-radius:12px;box-shadow:0 8px 30px #00000026}.modal-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem}h3{margin:0;color:#003d7a}.close-button{border:0;background:transparent;color:#374151;cursor:pointer;font-size:1.75rem}@media(max-width:650px){.content{padding:1.5rem 1rem}.heading{align-items:flex-start;flex-direction:column}}
</style>
