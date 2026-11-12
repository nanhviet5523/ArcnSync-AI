import type { UserRole } from '@/types/role';

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
}

export const ROUTES = {
  // Public routes that use the current header and footer.
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',

  // Admin is the only role with its own landing page
  ADMIN_DASHBOARD: '/admin-dashboard',
} as const;

// Default destination after login: the shared homepage for everyone, except admin who goes to the dashboard.
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOME,
  staff: ROUTES.HOME,
  designer: ROUTES.HOME,
  supplier: ROUTES.HOME,
  admin: ROUTES.ADMIN_DASHBOARD,
};
