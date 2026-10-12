<template>
  <div class="page">
    <AppHeader
      title="ProDUS"
      subtitle="Gestión de Usuarios"
      :user-role="roleLabel"
      :user-name="userName || 'Usuario'"
      @logout="handleLogout"
    />

    <main class="content">
      <button class="back-button" type="button" @click="router.push('/home')">Volver al inicio</button>
      <div class="heading">
        <div>
          <p class="eyebrow">Administración</p>
          <h2>Usuarios del sistema</h2>
          <p class="intro">Consulta los usuarios, sus roles y su estado actual.</p>
        </div>
        <button class="refresh-button" type="button" :disabled="loading" @click="loadUsers">
          {{ loading ? 'Cargando...' : 'Actualizar' }}
        </button>
      </div>

      <section v-if="errorMessage" class="message error" role="alert">{{ errorMessage }}</section>
      <section v-else-if="loading" class="card loading">Cargando usuarios...</section>
      <section v-else-if="users.length === 0" class="card empty">No hay usuarios registrados.</section>
      <section v-else class="card table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre completo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.username }}</td>
              <td>{{ user.full_name || '-' }}</td>
              <td>{{ getRoleLabel(user) }}</td>
              <td>
                <span :class="['status', user.is_active ? 'active' : 'inactive']">
                  {{ user.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td class="actions">
                <button class="edit-button" type="button" @click="openEdit(user)">Editar</button>
                <button class="delete-button" type="button" @click="deleteUser(user)">Borrar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <section v-if="successMessage" class="message success" role="status">{{ successMessage }}</section>
      <div v-if="editingUser" class="modal-overlay">
        <section class="edit-card edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <div class="modal-heading">
            <h3 id="edit-user-title">Editar usuario</h3>
            <button class="close-button" type="button" aria-label="Cerrar" @click="closeEdit">×</button>
          </div>
          <form @submit.prevent="saveEdit">
            <div class="edit-grid">
              <label>Usuario
                <input v-model.trim="editForm.username" required />
              </label>
              <label>Nombre completo
                <input v-model.trim="editForm.full_name" required />
              </label>
              <label>Rol
                <select v-model="editForm.role" required>
                  <option value="asistente">Asistente</option>
                  <option value="coordinador">Coordinador</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label class="checkbox-label">
                <input v-model="editForm.is_active" type="checkbox" />
                Usuario activo
              </label>
            </div>
            <div class="edit-actions">
              <button class="cancel-button" type="button" @click="closeEdit">Cancelar</button>
              <button class="save-button" type="submit" :disabled="saving">{{ saving ? 'Guardando...' : 'Guardar cambios' }}</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import { useAuth } from '@/composables/useAuth'
import api, { type UserListItem } from '@/services/api'

const router = useRouter()
const { userName, userRole, userId, logout } = useAuth()
const users = ref<UserListItem[]>([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const editingUser = ref<UserListItem | null>(null)
const saving = ref(false)
const editForm = reactive({ username: '', full_name: '', role: 'asistente', is_active: true })
const roleLabel = computed(() => userRole.value || 'Administrador')

const getRoleLabel = (user: UserListItem) => {
  if (user.is_admin || user.role === 'admin') return 'Administrador'
  if (user.role === 'asistente' || user.role === 'assistant') return 'Asistente'
  if (user.role === 'coordinador' || user.role === 'coordinator') return 'Coordinador'
  return user.role || 'Sin rol'
}

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value))
}

const loadUsers = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    users.value = await api.listUsers()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.'
  } finally {
    loading.value = false
  }
}

const openEdit = (user: UserListItem) => {
  editingUser.value = user
  editForm.username = user.username
  editForm.full_name = user.full_name
  editForm.role = user.is_admin ? 'admin' : user.role || 'asistente'
  editForm.is_active = user.is_active
}

const closeEdit = () => {
  editingUser.value = null
}

const saveEdit = async () => {
  if (!editingUser.value) return
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await api.updateUser(editingUser.value.id, editForm)
    closeEdit()
    successMessage.value = 'Usuario actualizado correctamente.'
    await loadUsers()
    successMessage.value = 'Usuario actualizado correctamente.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo actualizar el usuario.'
  } finally {
    saving.value = false
  }
}

const deleteUser = async (user: UserListItem) => {
  if (userId.value === user.id) {
    window.alert('No puedes eliminar tu propio usuario.')
    return
  }
  const confirmed = window.confirm(`¿Deseas eliminar al usuario "${user.username}"? Esta acción no se puede deshacer.`)
  if (!confirmed) return

  errorMessage.value = ''
  successMessage.value = ''
  try {
    await api.deleteUser(user.id)
    await loadUsers()
    successMessage.value = 'Usuario eliminado correctamente.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo eliminar el usuario.'
  }
}

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

onMounted(() => {
  void loadUsers()
})
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f5f5; }
.content { max-width: 1150px; margin: 0 auto; padding: 2rem; }
.back-button, .refresh-button { border: 1px solid #cbd5e1; border-radius: 7px; padding: .65rem 1rem; background: #fff; color: #003d7a; cursor: pointer; font: inherit; font-weight: 600; }
.back-button { margin-bottom: 1.5rem; }
.refresh-button:disabled { cursor: not-allowed; opacity: .6; }
.heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; margin-bottom: 1.5rem; }
.eyebrow { margin: 0 0 .25rem; color: #0052a3; font-size: .8rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h2 { margin: 0; color: #003d7a; }
.intro { margin: .5rem 0 0; color: #6b7280; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 4px 14px #00000012; }
.loading, .empty { padding: 2rem; color: #6b7280; text-align: center; }
.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 700px; }
th, td { padding: 1rem; border-bottom: 1px solid #e5e7eb; text-align: left; }
th { background: #f8fafc; color: #003d7a; font-size: .85rem; }
td { color: #374151; }
.status { display: inline-block; border-radius: 999px; padding: .25rem .65rem; font-size: .8rem; font-weight: 700; }
.status.active { background: #dcfce7; color: #166534; }
.status.inactive { background: #fee2e2; color: #991b1b; }
.actions { display: flex; gap: .5rem; }
.actions button { border: 0; border-radius: 6px; padding: .45rem .65rem; color: #fff; cursor: pointer; font: inherit; font-size: .8rem; font-weight: 600; }
.edit-button { background: #0052a3; }
.delete-button { background: #dc2626; }
.message { padding: 1rem; border-radius: 7px; }
.error { background: #fef2f2; color: #b91c1c; }
.success { margin-top: 1rem; background: #ecfdf5; color: #047857; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem; background: #00000059; }
.edit-card { padding: 1.5rem; background: #fff; border-radius: 12px; box-shadow: 0 8px 30px #00000026; }
.edit-modal { width: min(650px, 100%); max-height: 90vh; overflow-y: auto; }
.modal-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.edit-card h3 { margin: 0; color: #003d7a; }
.close-button { border: 0; background: transparent; color: #374151; cursor: pointer; font-size: 1.75rem; line-height: 1; }
.edit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.edit-grid label { display: flex; flex-direction: column; gap: .4rem; color: #374151; font-weight: 600; }
.edit-grid input:not([type='checkbox']), .edit-grid select { padding: .65rem; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
.checkbox-label { flex-direction: row !important; align-items: center; padding-top: 1.8rem; }
.edit-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.5rem; }
.edit-actions button { border: 0; border-radius: 6px; padding: .65rem 1rem; cursor: pointer; font: inherit; font-weight: 600; }
.cancel-button { background: #e5e7eb; color: #374151; }
.save-button { background: #0052a3; color: #fff; }
.save-button:disabled { cursor: not-allowed; opacity: .6; }
@media (max-width: 650px) {
  .content { padding: 1.5rem 1rem; }
  .heading { align-items: flex-start; flex-direction: column; }
  .edit-grid { grid-template-columns: 1fr; }
  .checkbox-label { padding-top: 0; }
}
</style>
