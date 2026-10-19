<template>
  <header class="app-header">
    <div class="header-content">
      <div class="header-branding">
        <img
          class="title-image"
          src="/titulo.png"
          :alt="`${title} - ${subtitle}`"
        />
      </div>
      <div class="header-banner">
        <img src="/banner.png" alt="ProDUS" />
      </div>
      <div class="header-user">
        <div class="user-info">
          <span class="user-role">{{ displayRole }}</span>
          <span class="user-name">{{ userName }}</span>
        </div>
        <button 
          @click="handleLogout" 
          class="logout-btn"
          :disabled="isLoggingOut"
        >
          {{ isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión' }}
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ROLES, type UserRole } from '@/config/roles'

const props = defineProps<{
  title: string
  subtitle: string
  userRole: string
  userName: string
}>()

const displayRole = computed(() => {
  const normalizedRole = props.userRole.trim().toLowerCase()
  const roleAliases: Record<string, UserRole> = {
    admin: 'admin',
    administrador: 'admin',
    coordinador: 'coordinador',
    coordinator: 'coordinador',
    asistente: 'asistente',
    assistant: 'asistente',
  }
  const role = roleAliases[normalizedRole]
  return role ? ROLES[role].label : props.userRole
})

const emit = defineEmits<{
  logout: []
}>()

const isLoggingOut = ref(false)

const handleLogout = async () => {
  isLoggingOut.value = true
  try {
    emit('logout')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style scoped>
.app-header {
  background-color: #061b4b;
  color: white;
  padding: 1.5rem 0;
  box-shadow: none;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 2rem;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(300px, 2.5fr) auto;
  gap: 2rem;
  align-items: center;
}

.header-branding {
  min-width: 0;
}

.title-image {
  display: block;
  width: min(100%, 260px);
  height: auto;
  max-height: 100px;
  object-fit: contain;
  object-position: left center;
}

.header-banner {
  min-width: 0;
}

.header-banner img {
  display: block;
  width: 100%;
  max-height: 110px;
  object-fit: cover;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.user-role {
  font-size: 0.875rem;
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-name {
  font-size: 1.125rem;
  font-weight: 600;
}

.logout-btn {
  padding: 0.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.logout-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

.logout-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .header-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .header-branding,
  .header-banner {
    width: 100%;
  }

  .title-image {
    margin: 0 auto;
  }

  .header-user {
    width: 100%;
    justify-content: space-between;
  }

  .user-info {
    align-items: flex-start;
  }
}
</style>
