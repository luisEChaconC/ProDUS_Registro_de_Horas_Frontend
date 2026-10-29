<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)

onMounted(() => {
  if (route.query.reset === 'success') {
    successMessage.value = 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.'
  }
})

async function handleLogin() {
  errorMessage.value = ''
  loading.value = true
  try {
    await api.login({ username: username.value, password: password.value })
    // Redirige al home si el login es exitoso
    router.push('/home')
  } catch (error) {
    errorMessage.value = error instanceof Error && error.message
      ? error.message
      : 'Usuario o contraseña incorrectos'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <h2>Iniciar sesión</h2>
    <div v-if="successMessage" class="success">{{ successMessage }}</div>
    <form @submit.prevent="handleLogin">
      <div>
        <label for="username">Usuario</label>
        <input id="username" v-model="username" autocomplete="username" />
      </div>
      <div>
        <label for="password">Contraseña</label>
        <input id="password" type="password" v-model="password" autocomplete="current-password" />
      </div>
      <button type="submit" :disabled="loading">Entrar</button>
      <RouterLink class="forgot-link" to="/recuperar-contrasena">¿Olvidaste tu contraseña?</RouterLink>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    </form>
  </div>
</template>

<style scoped>
.login-container {
  max-width: 350px;
  margin: 60px auto;
  padding: 2rem;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
form > div {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.3rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}
button {
  width: 100%;
  padding: 0.7rem;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
button:disabled {
  background: #90caf9;
  cursor: not-allowed;
}
.success {
  color: #166534;
  background: #dcfce7;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  text-align: center;
  font-size: 0.9rem;
}
.error {
  color: #d32f2f;
  margin-top: 1rem;
  text-align: center;
}
.forgot-link {
  display: block;
  margin-top: 1rem;
  text-align: center;
  color: #1976d2;
}
</style>
