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

  // Role-based landing pages
  HOMEOWNER_PROJECTS: '/homeowner/projects',
  STAFF_PROJECTS: '/staff/projects',
  DESIGNER_PROJECTS: '/designer/projects',
  SUPPLIER_CATALOG: '/supplier-catalog',
  ADMIN_USERS: '/admin-users',
} as const;

// Default destination after a successful login for each role.
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOMEOWNER_PROJECTS,
  staff: ROUTES.STAFF_PROJECTS,
  designer: ROUTES.DESIGNER_PROJECTS,
  supplier: ROUTES.SUPPLIER_CATALOG,
  admin: ROUTES.ADMIN_USERS,
};
