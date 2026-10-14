import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const toasts = ref<Toast[]>([])
let nextToastId = 1

export const useToast = () => {
  const showToast = (message: string, type: ToastType = 'info', duration = 5000) => {
    const id = nextToastId++
    toasts.value.push({ id, message, type })
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((toast) => toast.id !== id)
    }, duration)
  }

  const dismissToast = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { toasts, showToast, dismissToast }
}
