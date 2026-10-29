<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api, { ApiError } from '@/services/api'

const router = useRouter()
const username = ref('')
const code = ref('')
const message = ref('')
const error = ref('')
const loading = ref(false)
const codeSent = ref(false)
const secondsRemaining = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const startTimer = (seconds: number) => {
  if (timer) clearInterval(timer)
  secondsRemaining.value = seconds
  timer = setInterval(() => {
    secondsRemaining.value -= 1
    if (secondsRemaining.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

const requestCode = async () => {
  error.value = ''
  message.value = ''
  if (!username.value.trim()) {
    error.value = 'Ingresa tu nombre de usuario.'
    return
  }
  loading.value = true
  try {
    const response = await api.requestPasswordReset(username.value.trim())
    codeSent.value = true
    message.value = response.detail
    startTimer(response.retry_after || 60)
  } catch (reason) {
    error.value = reason instanceof ApiError || reason instanceof Error
      ? reason.message
      : 'No se pudo procesar la solicitud.'
  } finally {
    loading.value = false
  }
}

const verifyCode = async () => {
  error.value = ''
  if (!/^\d{6}$/.test(code.value.trim())) {
    error.value = 'El código debe tener exactamente 6 dígitos.'
    return
  }
  loading.value = true
  try {
    const response = await api.verifyPasswordReset(username.value.trim(), code.value.trim())
    sessionStorage.setItem('password_reset_token', response.reset_token)
    router.push('/restablecer-contrasena')
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'El código no es válido.'
  } finally {
    loading.value = false
  }
}

const changeUser = () => {
  codeSent.value = false
  code.value = ''
  error.value = ''
  message.value = ''
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  secondsRemaining.value = 0
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="reset-container">
    <h2>Restablecer contraseña</h2>
    <p class="description">Ingresa tu usuario institucional. Si tiene un correo registrado (@ucr.ac.cr), recibirás un código de 6 dígitos.</p>
    <form @submit.prevent="codeSent ? verifyCode() : requestCode()">
      <label for="username">Usuario</label>
      <input
        id="username"
        v-model.trim="username"
        :disabled="loading || codeSent"
        autocomplete="username"
        required
      />

      <template v-if="codeSent">
        <label for="code">Código de verificación (6 dígitos)</label>
        <input
          id="code"
          v-model.trim="code"
          inputmode="numeric"
          maxlength="6"
          pattern="\d{6}"
          placeholder="000000"
          autocomplete="one-time-code"
          required
        />
      </template>

      <button type="submit" :disabled="loading || (codeSent && !code)">
        {{ codeSent ? 'Verificar código' : 'Enviar código' }}
      </button>

      <button
        v-if="codeSent"
        class="secondary"
        type="button"
        :disabled="loading || secondsRemaining > 0"
        @click="requestCode"
      >
        {{ secondsRemaining > 0 ? `Reenviar en ${secondsRemaining}s` : 'Reenviar código' }}
      </button>

      <button
        v-if="codeSent"
        class="link-button"
        type="button"
        :disabled="loading"
        @click="changeUser"
      >
        Cambiar usuario
      </button>

      <p v-if="message" class="message">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <RouterLink to="/login">Volver a iniciar sesión</RouterLink>
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
h2 {
  margin-top: 0;
  color: #003d7a;
}
.description {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
}
label {
  display: block;
  margin: 1rem 0 0.3rem;
  font-weight: 500;
}
input {
  width: 100%;
  padding: 0.6rem;
  box-sizing: border-box;
  border: 1px solid #ccc;
  border-radius: 4px;
}
input:disabled {
  background: #f5f5f5;
  color: #666;
}
button {
  width: 100%;
  margin-top: 1rem;
  padding: 0.7rem;
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
.secondary {
  background: #607d8b;
}
.link-button {
  background: transparent;
  color: #0052a3;
  padding: 0.3rem;
  margin-top: 0.5rem;
  text-decoration: underline;
  font-weight: normal;
  font-size: 0.85rem;
}
.message {
  color: #166534;
  background: #dcfce7;
  padding: 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
}
.error {
  color: #d32f2f;
  margin-top: 0.75rem;
}
a {
  display: block;
  margin-top: 1.25rem;
  text-align: center;
  color: #1976d2;
}
</style>
