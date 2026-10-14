import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@/types/role';
import { getCurrentDemoUser } from '@/services/authService';
import { ROUTES, DEFAULT_ROLE_REDIRECT } from './routes.config';

interface ProtectedRouteProps {
  userRole?: UserRole | null;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  userRole = getCurrentDemoUser()?.role,
  allowedRoles,
}) => {
  // 1. Chưa đăng nhập -> Chuyển hướng về trang Login
  if (!userRole) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // 2. Không có quyền truy cập vai trò này -> Chuyển hướng về đúng Dashboard của role đó
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={DEFAULT_ROLE_REDIRECT[userRole]} replace />;
  }

  // 3. Đúng quyền -> Cho phép render route con
  return <Outlet />;
};

export default ProtectedRoute;
