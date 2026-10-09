// ============================================
// CAMPOS DE USER
// ============================================
const userFields = [
  {
    name: 'username',
    label: 'Usuario',
    type: 'text',
    placeholder: 'Ej: Atorres',
    required: true,
    order: 1,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'full_name',
    label: 'Nombre completo',
    type: 'text',
    placeholder: 'Ej: Ana Torres',
    required: true,
    order: 2,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'password',
    placeholder: 'Mínimo 8, 1 mayúscula y 1 número',
    required: true,
    pattern: '^(?=.*[A-Z])(?=.*\\d).{8,}$',
    patternMessage: 'Debe tener mínimo 8 caracteres, una mayúscula y un número',
    order: 3,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'password_confirm',
    label: 'Confirmar contraseña',
    type: 'password',
    placeholder: 'Repite la contraseña',
    required: true,
    order: 4,
    span: 1,
    spaceAfter: 'lg'
  },
]

// ============================================
// CAMPOS DE ASSISTANT
// ============================================
const assistantFields = [
  {
    name: 'start_date',
    label: 'Fecha de inicio',
    type: 'date',
    required: true,
    order: 6,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'end_date',
    label: 'Fecha de fin',
    type: 'date',
    required: false,
    order: 7,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'weekly_hours',
    label: 'Horas semanales',
    type: 'number',
    placeholder: 'Ej: 40',
    required: true,
    order: 8,
    span: 1,
    spaceAfter: 'none'
  }
]

export const assistantFormFields = [
  ...userFields,
  ...assistantFields
]
