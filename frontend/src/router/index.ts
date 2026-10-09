import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import HomeView from "../views/HomeView.vue";
import RegistroHorasView from "../views/RegistroHorasView.vue";
import BlockedView from "../views/BlockedView.vue";
import ManageAssistantsView from "../views/ManageAssistantsView.vue";

// Extender tipo de RouteMeta para agregar requiredRoles
declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiredRoles?: string[];
  }
}

// Función para verificar si el usuario tiene un token válido
const isUserAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token');
  if (!token) return false;
  
  try {
    // Decodificar el token para verificar si no ha expirado
    const base64Url = token.split('.')[1];
    if (!base64Url) return false;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

// Función para obtener el rol del usuario desde el token
const getUserRoleFromToken = (): string | null => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded.is_admin || decoded.is_superuser) return 'admin';
    return decoded.role || null;
  } catch {
    return null;
  }
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "login",
      component: LoginView,
    },
    {
      path: "/login",
      name: "login-page",
      component: LoginView,
    },
    {
      path: "/home",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
    },

    {
      path: "/blocked",
      name: "blocked",
      component: BlockedView,
    },
    {
      path: "/registro-horas",
      name: "registro-horas",
      component: RegistroHorasView,
      meta: { requiresAuth: true },
    },
    {
      path: "/gestionar-asistentes",
      name: "manage-assistants",
      component: ManageAssistantsView,
      meta: { requiresAuth: true, requiredRoles: ['coordinador', 'admin'] },

    },
  ],
});

// Guard para verificar autenticación y permisos de rol
router.beforeEach((to) => {
  const isAuthenticated = isUserAuthenticated();
  const requiresAuth = to.meta.requiresAuth;
  const requiredRoles = to.meta.requiredRoles as string[] | undefined;

  if (requiresAuth && !isAuthenticated) {
    return { name: 'login' };
  }

  if ((to.name === 'login' || to.name === 'login-page' || to.path === '/') && isAuthenticated) {
    return { name: 'home' };
  }

  // Validar permisos de rol si la ruta los requiere
  if (requiredRoles && requiredRoles.length > 0 && isAuthenticated) {
    const userRole = getUserRoleFromToken();
    if (!userRole || !requiredRoles.includes(userRole)) {
      return { name: 'blocked' };
    }
  }

  return true;
});

export default router;
