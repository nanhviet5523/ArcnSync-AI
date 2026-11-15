import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from '@/features/home/HomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { VerifyOtpPage } from '@/features/auth/VerifyOtpPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { AcceptInvitation } from '@/features/auth/AcceptInvitation';
import { ProfileSettings } from '@/features/shared/ProfileSettings';
import { CustomerDirectory } from '@/features/shared/CustomerDirectory';
import { ApartmentManagement } from '@/features/shared/ApartmentManagement';
import { AdminUsersRoles } from '@/features/admin/AdminUsersRoles';
import { AdminUsersPage } from '@/features/admin/users/AdminUsersPage';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { AdminMasterData } from '@/features/admin/AdminMasterData';
import { AdminProducts } from '@/features/admin/AdminProducts';
import { SupplierCatalog } from '@/features/supplier/SupplierCatalog';
import { SupplierProductDetail } from '@/features/supplier/SupplierProductDetail';
import { SupplierProductForm } from '@/features/supplier/SupplierProductForm';
import { SupplierDashboard } from '@/features/supplier/SupplierDashboard';
import { DesignerCatalog } from '@/features/designer/DesignerCatalog';
import { NoApiPage } from '@/components/common/NoApiPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';

const ALL_ROLES: UserRole[] = ['homeowner', 'designer', 'staff', 'supplier', 'admin'];
const PREVIEW_ROLES: UserRole[] = ['homeowner'];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setAuthRevision] = useState(0);

  useEffect(() => {
    window.localStorage.removeItem('archsync-demo-workspace-v1');
    const refreshAuth = () => setAuthRevision((revision) => revision + 1);
    window.addEventListener('archsync-auth-change', refreshAuth);
    window.addEventListener('storage', refreshAuth);
    return () => {
      window.removeEventListener('archsync-auth-change', refreshAuth);
      window.removeEventListener('storage', refreshAuth);
    };
  }, []);

  const pageVariants = {
    initial: {
      x: location.pathname === '/signup' ? 40 : -40,
      opacity: 0,
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.35,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
    exit: {
      x: location.pathname === '/signup' ? -40 : 40,
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 1, 0.5, 1] as const,
      },
    },
  };

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div
      className={`w-full bg-white relative ${
        isAuthPage ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'
      }`}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <HomePage
                onNavigateToLogin={() => navigate('/login')}
                onNavigateToSignUp={() => navigate('/signup')}
              />
            }
          />

          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path="/staff-dashboard" element={<NoApiPage role="staff" title="Staff dashboard" />} />
            <Route path="/staff-apartments" element={<ApartmentManagement />} />
            <Route path="/staff-requests" element={<NoApiPage role="staff" title="Requests" />} />
            <Route path="/staff-request-detail" element={<NoApiPage role="staff" title="Request details" />} />
            <Route path="/create-contract" element={<NoApiPage role="staff" title="Create contract" />} />