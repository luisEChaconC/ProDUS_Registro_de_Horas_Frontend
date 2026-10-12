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
// CAMPOS DE COORDINATOR
// ============================================
const coordinatorFields = [
  {
    name: 'is_active',
    label: 'Usuario activo',
    type: 'checkbox',
    defaultValue: true,
    order: 5,
    span: 1,
    spaceAfter: 'sm'
  },
  {
    name: 'project_ids',
    label: 'Proyectos a cargo',
    type: 'select',
    multiple: true,
    options: [],
    required: false,
    order: 6,
    span: 2,
    spaceAfter: 'lg'
  }
]

export const coordinatorFormFields = [
  ...userFields,
  ...coordinatorFields
]
