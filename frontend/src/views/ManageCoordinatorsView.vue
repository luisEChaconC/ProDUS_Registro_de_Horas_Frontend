<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import GenericForm from '@/components/GenericForm.vue'
import { coordinatorFormFields } from '@/forms/coordinatorForm.schema'
import { useAuth } from '@/composables/useAuth'
import api, { type ProjectOption, type UserListItem } from '@/services/api'

const router = useRouter()
const { userName, userRole, userId, logout } = useAuth()
const coordinators = ref<UserListItem[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showModal = ref(false)
const editingCoordinator = ref<UserListItem | null>(null)
const form = reactive({ username: '', full_name: '', password: '', password_confirm: '', is_active: true, project_ids: [] as number[] })
const projects = ref<ProjectOption[]>([])
const formInitialValues = ref<Record<string, unknown>>({})
const coordinatorFields = coordinatorFormFields
const visibleCoordinatorFields = computed(() => editingCoordinator.value
  ? coordinatorFields.filter((field) => !['password', 'password_confirm'].includes(field.name))
  : coordinatorFields)

const updateProjectOptions = () => {
  const projectField = coordinatorFields.find((field) => field.name === 'project_ids') as
    { options?: Array<{ label: string; value: number }> } | undefined
  if (projectField) {
    projectField.options = projects.value.map((project) => ({ label: project.name, value: project.id }))
  }
}

const resetForm = () => Object.assign(form, {
  username: '',
  full_name: '',
  password: '',
  password_confirm: '',
  is_active: true,
  project_ids: [],
})

const loadCoordinators = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const [coordinatorList, projectResponse] = await Promise.all([
      api.listCoordinators(),
      api.getActiveProjects(),
    ])
    coordinators.value = coordinatorList
    projects.value = projectResponse.results
    updateProjectOptions()
  }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar los coordinadores.' }
  finally { loading.value = false }
}

const openCreate = () => {
  resetForm()
  editingCoordinator.value = null
  formInitialValues.value = { is_active: true, project_ids: [] }
  showModal.value = true
}
const openEdit = (coordinator: UserListItem) => {
  editingCoordinator.value = coordinator
  Object.assign(form, { username: coordinator.username, full_name: coordinator.full_name, is_active: coordinator.is_active, password: '', password_confirm: '' })
  formInitialValues.value = {
    username: coordinator.username,
    full_name: coordinator.full_name,
    is_active: coordinator.is_active,
    project_ids: coordinator.project_ids || [],
  }
  showModal.value = true
}
const closeModal = () => { showModal.value = false; editingCoordinator.value = null }

const saveCoordinator = async () => {
  saving.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    if (editingCoordinator.value) {
      await api.updateCoordinator(editingCoordinator.value.id, {
        username: form.username,
        full_name: form.full_name,
        is_active: form.is_active,
        project_ids: form.project_ids,
      })
      successMessage.value = 'Coordinador actualizado correctamente.'
    } else {
      if (!form.password || form.password !== form.password_confirm) {
        errorMessage.value = 'Las contraseñas son obligatorias y deben coincidir.'
        return
      }
      await api.createCoordinator({
        username: form.username,
        full_name: form.full_name,
        password: form.password,
        password_confirm: form.password_confirm,
        project_ids: form.project_ids,
      })
      successMessage.value = 'Coordinador creado correctamente.'
    }
    closeModal(); await loadCoordinators()
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'No se pudo guardar el coordinador.' }
  finally { saving.value = false }
}

const deleteCoordinator = async (coordinator: UserListItem) => {
  if (userId.value === coordinator.id) { window.alert('No puedes eliminar tu propio usuario.'); return }
  if (!window.confirm(`¿Deseas eliminar al coordinador "${coordinator.username}"? Esta acción no se puede deshacer.`)) return
  try { await api.deleteUser(coordinator.id); successMessage.value = 'Coordinador eliminado correctamente.'; await loadCoordinators() }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'No se pudo eliminar el coordinador.' }
}

const handleFormSubmit = async (values: Record<string, unknown>) => {
  Object.assign(form, values)
  await saveCoordinator()
}

const handleLogout = async () => { await logout(); router.push('/login') }
onMounted(() => { void loadCoordinators() })
</script>

<template>
  <div class="page">
    <AppHeader title="ProDUS" subtitle="Gestión de Coordinadores" :user-role="userRole || 'Administrador'" :user-name="userName || 'Usuario'" @logout="handleLogout" />
    <main class="content">
      <button class="back-button" type="button" @click="router.push('/home')">Volver al inicio</button>
      <div class="heading">
        <div><p class="eyebrow">Administración</p><h2>Coordinadores del sistema</h2><p class="intro">Crea, edita o elimina usuarios con rol coordinador.</p></div>
        <button class="primary-button" type="button" @click="openCreate">Añadir coordinador</button>
      </div>
      <section v-if="errorMessage" class="message error" role="alert">{{ errorMessage }}</section>
      <section v-if="successMessage" class="message success" role="status">{{ successMessage }}</section>
      <section v-if="loading" class="card state">Cargando coordinadores...</section>
      <section v-else-if="coordinators.length === 0" class="card state">No hay coordinadores registrados.</section>
      <section v-else class="card table-wrapper">
        <table><thead><tr><th>Usuario</th><th>Nombre completo</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody><tr v-for="coordinator in coordinators" :key="coordinator.id">
            <td>{{ coordinator.username }}</td><td>{{ coordinator.full_name || '-' }}</td>
            <td><span :class="['status', coordinator.is_active ? 'active' : 'inactive']">{{ coordinator.is_active ? 'Activo' : 'Inactivo' }}</span></td>
            <td class="actions"><button class="edit-button" type="button" @click="openEdit(coordinator)">Editar</button><button class="delete-button" type="button" @click="deleteCoordinator(coordinator)">Borrar</button></td>
          </tr></tbody>
        </table>
      </section>
      <div v-if="showModal" class="modal-overlay"><section class="modal-card" role="dialog" aria-modal="true">
        <div class="modal-heading"><h3>{{ editingCoordinator ? 'Editar coordinador' : 'Nuevo coordinador' }}</h3><button class="close-button" type="button" aria-label="Cerrar" @click="closeModal">×</button></div>
        <GenericForm
          :title="editingCoordinator ? 'Editar coordinador' : 'Nuevo coordinador'"
          :fields="visibleCoordinatorFields"
          :initial-values="formInitialValues"
          confirm-text="Guardar"
          cancel-text="Cancelar"
          @confirm="handleFormSubmit"
          @cancel="closeModal"
        />
      </section></div>
    </main>
  </div>
</template>

<style scoped>
.page{min-height:100vh;background:#f5f5f5}.content{max-width:1150px;margin:0 auto;padding:2rem}.back-button,.primary-button{border:1px solid #cbd5e1;border-radius:7px;padding:.65rem 1rem;cursor:pointer;font:inherit;font-weight:600}.back-button{margin-bottom:1.5rem;background:#fff;color:#003d7a}.primary-button,.save-button{background:#0052a3;color:#fff}.heading{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1.5rem}.eyebrow{margin:0 0 .25rem;color:#0052a3;font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}h2{margin:0;color:#003d7a}.intro{margin:.5rem 0 0;color:#6b7280}.card{background:#fff;border-radius:12px;box-shadow:0 4px 14px #00000012}.state{padding:2rem;color:#6b7280;text-align:center}.table-wrapper{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:650px}th,td{padding:1rem;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;color:#003d7a}.status{display:inline-block;border-radius:999px;padding:.25rem .65rem;font-size:.8rem;font-weight:700}.active{background:#dcfce7;color:#166534}.inactive{background:#fee2e2;color:#991b1b}.actions{display:flex;gap:.5rem}.actions button,.modal-actions button{border:0;border-radius:6px;padding:.55rem .75rem;cursor:pointer;font:inherit;font-weight:600}.edit-button{background:#0052a3;color:#fff}.delete-button{background:#dc2626;color:#fff}.message{margin-bottom:1rem;padding:1rem;border-radius:7px}.error{background:#fef2f2;color:#b91c1c}.success{background:#ecfdf5;color:#047857}.modal-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem;background:#00000059}.modal-card{width:min(650px,100%);padding:1.5rem;background:#fff;border-radius:12px;box-shadow:0 8px 30px #00000026}.modal-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem}h3{margin:0;color:#003d7a}.close-button{border:0;background:transparent;color:#374151;cursor:pointer;font-size:1.75rem}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.form-grid label{display:flex;flex-direction:column;gap:.4rem;font-weight:600;color:#374151}.form-grid input:not([type=checkbox]){padding:.65rem;border:1px solid #cbd5e1;border-radius:6px;font:inherit}.checkbox-label{flex-direction:row!important;align-items:center;padding-top:1.8rem}.modal-actions{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.5rem}.cancel-button{background:#e5e7eb;color:#374151}.save-button{color:#fff}.save-button:disabled{cursor:not-allowed;opacity:.6}@media(max-width:650px){.content{padding:1.5rem 1rem}.heading{align-items:flex-start;flex-direction:column}.form-grid{grid-template-columns:1fr}.checkbox-label{padding-top:0}}
</style>
