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

// Đường dẫn mặc định sau khi đăng nhập / khi role không đủ quyền xem 1 trang:
// Trang chủ chung cho mọi role, riêng Admin vào thẳng Dashboard.
export const DEFAULT_ROLE_REDIRECT: Record<UserRole, string> = {
  homeowner: ROUTES.HOME,
  staff: ROUTES.HOME,
  designer: ROUTES.HOME,
  supplier: ROUTES.HOME,
  admin: ROUTES.ADMIN_OVERVIEW,
};
