import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { UserRole } from '@/types/role';
import { getCurrentUser } from '@/services/authService';
import { ROUTES, DEFAULT_ROLE_REDIRECT } from './routes.config';

interface ProtectedRouteProps {
  userRole?: UserRole | null;
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  userRole = getCurrentUser()?.role,
  allowedRoles,
}) => {
  // 1. Redirect unauthenticated users to the login page.
  if (!userRole) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // 2. Redirect users without access to this role to their dashboard.
  if (!allowedRoles.includes(userRole)) {
    return <Navigate to={DEFAULT_ROLE_REDIRECT[userRole]} replace />;
  }

  // 3. Render the child route when the user has the required role.
  return <Outlet />;
};

export default ProtectedRoute;
