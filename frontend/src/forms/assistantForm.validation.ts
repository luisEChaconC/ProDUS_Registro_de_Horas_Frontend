import z from 'zod'

export const assistantFormSchema = z.object({
  // User fields
  username: z.string().min(3, 'Usuario debe tener mínimo 3 caracteres'),
  full_name: z.string().min(3, 'Nombre debe tener mínimo 3 caracteres'),
  password: z.string()
    .min(8, 'Debe tener mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/\d/, 'Debe tener al menos un número'),
  password_confirm: z.string(),
  
  // Assistant fields
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Fecha inválida'),
  end_date: z.string().optional(),
  weekly_hours: z.number().min(1, 'Horas debe ser mayor a 0').max(168, 'Horas no puede exceder 168'),
}).refine((data) => data.password === data.password_confirm, {
  message: 'Las contraseñas no coinciden',
  path: ['password_confirm'],
})

export type AssistantFormInput = z.infer<typeof assistantFormSchema>
