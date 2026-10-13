import type { UserRole } from '@/types/role';

export interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
}

export const ROUTES = {
  // Public Routes (Dùng Header & Footer hiện tại)
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',

  // Role-based Protected Dashboards
  HOMEOWNER_DASHBOARD: '/dashboard',
  STAFF_WORKSPACE: '/staff/workspace',
  DESIGNER_PROJECTS: '/designer/projects',
  SUPPLIER_PORTAL: '/supplier/portal',
  ADMIN_OVERVIEW: '/admin/overview',
  ADMIN_USERS: '/admin/users',
  ADMIN_MASTER_DATA: '/admin/master-data',
  ADMIN_AI_SETTINGS: '/admin/ai-settings',
} as const;

// Đường dẫn mặc định được chuyển hướng tới sau khi đăng nhập thành công theo từng Role
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOMEOWNER_DASHBOARD,
  staff: ROUTES.STAFF_WORKSPACE,
  designer: ROUTES.DESIGNER_PROJECTS,
  supplier: ROUTES.SUPPLIER_PORTAL,
  admin: ROUTES.ADMIN_OVERVIEW,
};