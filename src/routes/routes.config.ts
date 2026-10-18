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

  // Role-based Protected Dashboards
  HOMEOWNER_DASHBOARD: '/homeowner-dashboard',
  STAFF_WORKSPACE: '/staff-dashboard',
  DESIGNER_PROJECTS: '/designer-projects',
  SUPPLIER_PORTAL: '/supplier-dashboard',
  ADMIN_OVERVIEW: '/admin-dashboard',
} as const;

// Default destination after a successful login for each role.
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOMEOWNER_DASHBOARD,
  staff: ROUTES.STAFF_WORKSPACE,
  designer: ROUTES.DESIGNER_PROJECTS,
  supplier: ROUTES.SUPPLIER_PORTAL,
  admin: ROUTES.ADMIN_OVERVIEW,
};
