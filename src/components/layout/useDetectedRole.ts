import { useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';

/** Role from the prop, then the session, then the URL prefix. */
export function useDetectedRole(role?: UserRole): UserRole | undefined {
  const { pathname } = useLocation();
  return role ?? getCurrentUser()?.role ?? (
    pathname.startsWith('/admin') ? 'admin'
      : pathname.startsWith('/staff') ? 'staff'
        : pathname.startsWith('/designer') ? 'designer'
          : pathname.startsWith('/supplier') ? 'supplier'
            : pathname.startsWith('/homeowner') ? 'homeowner'
              : undefined);
}
