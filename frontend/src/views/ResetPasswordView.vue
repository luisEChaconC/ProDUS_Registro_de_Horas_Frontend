<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'

const router = useRouter()
const newPassword = ref('')
const confirmation = ref('')
const error = ref('')
const loading = ref(false)

onMounted(() => {
  if (!sessionStorage.getItem('password_reset_token')) router.replace('/recuperar-contrasena')
})

const submit = async () => {
  error.value = ''
  if (newPassword.value !== confirmation.value) {
    error.value = 'Las contraseñas no coinciden.'
    return
  }
  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(newPassword.value)) {
    error.value = 'La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.'
    return
  }
  loading.value = true
  try {
    const token = sessionStorage.getItem('password_reset_token')
    if (!token) {
      router.replace('/recuperar-contrasena')
      return
    }
    await api.confirmPasswordReset(token, newPassword.value, confirmation.value)
    sessionStorage.removeItem('password_reset_token')
    router.push({ path: '/login', query: { reset: 'success' } })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'No se pudo restablecer la contraseña.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="reset-container">
    <h2>Crear nueva contraseña</h2>
    <p class="hint">La contraseña debe tener al menos 8 caracteres, una letra mayúscula y un número.</p>
    <form @submit.prevent="submit">
      <label for="new-password">Nueva contraseña</label>
      <input
        id="new-password"
        v-model="newPassword"
        type="password"
        minlength="8"
        pattern="(?=.*[A-Z])(?=.*\d).{8,}"
        title="Mínimo 8 caracteres, una mayúscula y un número"
        autocomplete="new-password"
        required
      />
      <label for="confirmation">Confirmar contraseña</label>
      <input
        id="confirmation"
        v-model="confirmation"
        type="password"
        minlength="8"
        autocomplete="new-password"
        required
      />
      <button type="submit" :disabled="loading">Guardar contraseña</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.reset-container {
  max-width: 380px;
  margin: 60px auto;
  padding: 2rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,.08);
}
.hint {
  font-size: 0.85rem;
  color: #555;
  margin-bottom: 1rem;
}
label {
  display: block;
  margin: 1rem 0 .3rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: .6rem;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}
button {
  width: 100%;
  margin-top: 1rem;
  padding: .7rem;
  border: 0;
  border-radius: 4px;
  background: #1976d2;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}
button:disabled {
  background: #90caf9;
  cursor: not-allowed;
}
.error {
  color: #d32f2f;
  margin-top: 0.75rem;
}
</style>
