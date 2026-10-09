import { ref, computed, onMounted } from 'vue'
import type { UserRole } from '@/config/roles'
import { hasPermission, hasFeature } from '@/config/roles'
import api from '@/services/api'

interface DecodedToken {
  user_id: number
  username: string
  role?: string
  is_admin?: boolean
  is_superuser?: boolean
  exp: number
}

const normalizeRole = (rawRole: string | null | undefined): UserRole => {
  const value = (rawRole || '').toString().trim().toLowerCase()

  if (value === 'admin' || value === 'administrador') return 'admin'
  if (value === 'coordinador' || value === 'coordinator') return 'coordinador'
  if (value === 'asistente' || value === 'assistant') return 'asistente'

  return 'asistente'
}

export const useAuth = () => {
  const userRole = ref<UserRole | null>(null)
  const userName = ref('')
  const userId = ref<number | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)

  const decodeToken = (token: string): DecodedToken | null => {
    try {
      const base64Url = token.split('.')[1]
      if (!base64Url) return null
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (e) {
      console.error('Error decodificando token:', e)
      return null
    }
  }

  const loadUserFromToken = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        isAuthenticated.value = false
        userRole.value = 'asistente' // Role por defecto
        return
      }

      const decoded = decodeToken(token)
      if (!decoded || decoded.exp * 1000 < Date.now()) {
        // Token expirado
        localStorage.removeItem('access_token')
        isAuthenticated.value = false
        return
      }

      isAuthenticated.value = true
      userId.value = decoded.user_id
      userName.value = decoded.username

      const storedUser = api.getUser()
      if (storedUser) {
        userName.value = storedUser.full_name || storedUser.username
        userRole.value = storedUser.is_admin || decoded.is_admin || decoded.is_superuser
          ? 'admin'
          : normalizeRole(storedUser.role || decoded.role)
      } else {
        userRole.value = decoded.is_admin || decoded.is_superuser
          ? 'admin'
          : normalizeRole(decoded.role)
      }
    } catch (e) {
      console.error('Error al cargar usuario:', e)
      error.value = 'Error al cargar el perfil del usuario'
      isAuthenticated.value = false
    } finally {
      loading.value = false
    }
  }

  const logout = async () => {
    try {
      // Llamar al backend para invalidar la sesión
      await api.logout()
    } catch (e) {
      console.warn('Error al invalidar sesión en backend:', e)
    } finally {
      // Limpiar datos locales sin importar si el backend falla
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      sessionStorage.removeItem('ip_check_cache')
      isAuthenticated.value = false
      userRole.value = null
      userName.value = ''
      userId.value = null
      error.value = null
    }
  }

  const checkPermission = (permission: string): boolean => {
    if (!userRole.value) return false
    return hasPermission(userRole.value, permission)
  }

  const checkFeature = (feature: string): boolean => {
    if (!userRole.value) return false
    return hasFeature(userRole.value, feature)
  }

  onMounted(() => {
    loadUserFromToken()
  })

  return {
    userRole: computed(() => userRole.value),
    userName: computed(() => userName.value),
    userId: computed(() => userId.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    logout,
    checkPermission,
    checkFeature
  }
}
