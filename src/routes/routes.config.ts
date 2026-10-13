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
  HOMEOWNER_DASHBOARD: '/homeowner-dashboard',
  STAFF_WORKSPACE: '/staff-dashboard',
  DESIGNER_PROJECTS: '/designer-projects',
  SUPPLIER_PORTAL: '/supplier-dashboard',
  ADMIN_OVERVIEW: '/admin-dashboard',
} as const;

// Đường dẫn mặc định được chuyển hướng tới sau khi đăng nhập thành công theo từng Role
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOMEOWNER_DASHBOARD,
  staff: ROUTES.STAFF_WORKSPACE,
  designer: ROUTES.DESIGNER_PROJECTS,
  supplier: ROUTES.SUPPLIER_PORTAL,
  admin: ROUTES.ADMIN_OVERVIEW,
};
