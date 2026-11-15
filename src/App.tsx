import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NoApiPage } from '@/components/common/NoApiPage';
import { AcceptInvitation } from '@/features/auth/AcceptInvitation';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { VerifyOtpPage } from '@/features/auth/VerifyOtpPage';
import { AdminMasterData } from '@/features/admin/AdminMasterData';
import { AdminProducts } from '@/features/admin/AdminProducts';
import { AdminUsersPage } from '@/features/admin/users/AdminUsersPage';
import { AdminUsersRoles } from '@/features/admin/AdminUsersRoles';
import { ApartmentManagement } from '@/features/shared/ApartmentManagement';
import { CustomerDirectory } from '@/features/shared/CustomerDirectory';
import { ProfileSettings } from '@/features/shared/ProfileSettings';
import { HomePage } from '@/features/home/HomePage';
import { DesignerCatalog } from '@/features/designer/DesignerCatalog';
import { SupplierCatalog } from '@/features/supplier/SupplierCatalog';
import { SupplierDashboard } from '@/features/supplier/SupplierDashboard';
import { SupplierProductDetail } from '@/features/supplier/SupplierProductDetail';
import { SupplierProductForm } from '@/features/supplier/SupplierProductForm';
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
    initial: { x: location.pathname === '/signup' ? 40 : -40, opacity: 0 },
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] as const },
    },
    exit: {
      x: location.pathname === '/signup' ? -40 : 40,
      opacity: 0,
      transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const },
    },
  };
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <div className={`relative w-full bg-white ${isAuthPage ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-hidden'}`}>
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
            <Route path="/staff-contracts" element={<NoApiPage role="staff" title="Contracts" />} />
            <Route path="/staff-contract-detail" element={<NoApiPage role="staff" title="Contract details" />} />
            <Route path="/staff-addendum" element={<NoApiPage role="staff" title="Contract addendum" />} />
            <Route path="/staff-projects" element={<NoApiPage role="staff" title="Projects" />} />
            <Route path="/staff-project-detail" element={<NoApiPage role="staff" title="Project details" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<NoApiPage role="admin" title="Admin dashboard" />} />
            <Route path="/admin-apartments" element={<ApartmentManagement />} />
            <Route path="/admin-users" element={<AdminUsersPage />} />
            <Route path="/admin-users-legacy" element={<AdminUsersRoles />} />
            <Route path="/admin-master-data" element={<AdminMasterData />} />
            <Route path="/admin-products" element={<AdminProducts />} />
            <Route path="/admin-ai-settings" element={<NoApiPage role="admin" title="AI settings" />} />
            <Route path="/admin-prompts/:promptId" element={<NoApiPage role="admin" title="Prompt details" />} />
            <Route path="/admin-reports" element={<NoApiPage role="admin" title="Reports" />} />
            <Route path="/admin" element={<NoApiPage role="admin" title="Roles and permissions" />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminUsersRoles />} />
            <Route path="/admin/overview" element={<NoApiPage role="admin" title="Admin dashboard" />} />
            <Route path="/admin/dashboard" element={<NoApiPage role="admin" title="Admin dashboard" />} />
            <Route path="/admin/master-data" element={<AdminMasterData />} />
            <Route path="/admin/ai-settings" element={<NoApiPage role="admin" title="AI settings" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier-catalog" element={<SupplierCatalog />} />
            <Route path="/supplier-products/:productId" element={<SupplierProductDetail />} />
            <Route path="/supplier-products/new" element={<SupplierProductForm />} />
            <Route path="/supplier-products/:productId/edit" element={<SupplierProductForm />} />
            <Route path="/supplier-catalog/import" element={<NoApiPage role="supplier" title="Catalog import" />} />
            <Route path="/supplier-inquiries" element={<NoApiPage role="supplier" title="Inquiries" />} />
            <Route path="/supplier-application" element={<NoApiPage role="supplier" title="Supplier application" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['designer']} />}>
            <Route path="/designer-projects" element={<NoApiPage role="designer" title="Designer projects" />} />
            <Route path="/designer-projects/:projectId" element={<NoApiPage role="designer" title="Project details" />} />
            <Route path="/designer-ai-studio" element={<NoApiPage role="designer" title="AI Studio" />} />
            <Route path="/designer-catalog" element={<DesignerCatalog />} />
            <Route path="/designer-portfolio" element={<NoApiPage role="designer" title="Designer portfolio" />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['homeowner']} />}>
            <Route path="/homeowner-apartments" element={<ApartmentManagement />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
            <Route path="/messages" element={<NoApiPage title="Messages" />} />
            <Route path="/call-meeting" element={<NoApiPage title="Call and meeting" />} />
            <Route path="/settings" element={<ProfileSettings />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route path="/customers" element={<CustomerDirectory />} />
          </Route>

          {PREVIEW_ROLES.flatMap((role) =>
            ROLE_CONFIG[role].navItems
              .filter((item) => item.path !== '/messages' && item.path !== '/homeowner-apartments')
              .map((item) => (
                <Route key={`${role}-${item.path}`} element={<ProtectedRoute allowedRoles={[role]} />}>
                  <Route path={item.path} element={<NoApiPage role={role} title={item.label} />} />
                </Route>
              )),
          )}

          <Route
            path="/login"
            element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 h-full w-full">
                <LoginPage onNavigateToSignUp={() => navigate('/signup')} />
              </motion.div>
            }
          />
          <Route
            path="/signup"
            element={
              <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 h-full w-full">
                <SignUpPage onNavigateToLogin={() => navigate('/login')} />
              </motion.div>
            }
          />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/auth/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/accept-invite" element={<AcceptInvitation />} />
          <Route path="/activate-account" element={<AcceptInvitation />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
