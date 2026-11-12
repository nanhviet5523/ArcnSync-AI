import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
import { AdminUsersRoles } from '@/features/admin/AdminUsersRoles';
import { AdminUsersPage } from '@/features/admin/users/AdminUsersPage';
import { AdminMasterData } from '@/features/admin/AdminMasterData';
import { AdminProducts } from '@/features/admin/AdminProducts';
import { SupplierDashboard } from '@/features/supplier/SupplierDashboard';
import { SupplierCatalog } from '@/features/supplier/SupplierCatalog';
import { SupplierProductDetail } from '@/features/supplier/SupplierProductDetail';
import { SupplierProductForm } from '@/features/supplier/SupplierProductForm';
import { DesignerCatalog } from '@/features/designer/DesignerCatalog';
import { SupplierApplicationStatus } from '@/features/supplier/SupplierApplicationStatus';
import { WorkspacePage } from '@/features/design-workspace/WorkspacePage';
import { ProjectList } from '@/features/projects/ProjectList';
import { ProjectDetail } from '@/features/projects/ProjectDetail';
import { StaffProjectNew } from '@/features/projects/StaffProjectNew';
import { AdminCategories } from '@/features/admin/AdminCategories';
// Pages still running on sample data (demoWorkspaceService), kept until their API exists
import { CreateContract } from '@/features/staff/CreateContract';
import { StaffContracts } from '@/features/staff/StaffContracts';
import { StaffContractDetail } from '@/features/staff/StaffContractDetail';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { AdminReports } from '@/features/admin/AdminReports';
import { AdminAISettings } from '@/features/admin/AdminAISettings';
import { AdminPromptDetail } from '@/features/admin/AdminPromptDetail';
import { SupplierInquiries } from '@/features/supplier/SupplierInquiries';
import { DesignerPortfolio } from '@/features/designer/DesignerPortfolio';
import { DesignerAIStudio } from '@/features/designer/DesignerAIStudio';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { DEFAULT_ROLE_REDIRECT } from '@/routes/routes.config';
import { getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { t } from '@/i18n';

const ALL_ROLES: UserRole[] = ['homeowner', 'designer', 'staff', 'supplier', 'admin'];

/** Small strip on top of pages that still run on sample data. */
function SampleData({ children }: { children: ReactNode }) {
  return (
    <>
      <div role="note" className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-900">{t('common.sampleData')}</div>
      {children}
    </>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [, setAuthRevision] = useState(0);

  useEffect(() => {
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
              getCurrentUser()?.role === 'admin' ? (
                <Navigate to={DEFAULT_ROLE_REDIRECT.admin} replace />
              ) : (
                <HomePage
                  onNavigateToLogin={() => navigate('/login')}
                  onNavigateToSignUp={() => navigate('/signup')}
                />
              )
            }
          />

          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route path="/staff/projects" element={<ProjectList />} />
            <Route path="/staff/projects/new" element={<StaffProjectNew />} />
            <Route path="/staff/projects/:id" element={<ProjectDetail />} />
            <Route path="/customers" element={<CustomerDirectory />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path="/staff-contracts" element={<SampleData><StaffContracts /></SampleData>} />
            <Route path="/staff-contract-detail" element={<SampleData><StaffContractDetail /></SampleData>} />
            <Route path="/create-contract" element={<SampleData><CreateContract /></SampleData>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-users" element={<AdminUsersPage />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin-master-data" element={<AdminMasterData />} />
            <Route path="/admin-products" element={<AdminProducts />} />
            <Route path="/admin" element={<AdminUsersRoles />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminUsersRoles />} />
            <Route path="/admin/master-data" element={<AdminMasterData />} />
            <Route path="/admin-dashboard" element={<SampleData><AdminDashboard /></SampleData>} />
            <Route path="/admin/overview" element={<SampleData><AdminDashboard /></SampleData>} />
            <Route path="/admin/dashboard" element={<SampleData><AdminDashboard /></SampleData>} />
            <Route path="/admin-reports" element={<SampleData><AdminReports /></SampleData>} />
            <Route path="/admin-ai-settings" element={<SampleData><AdminAISettings /></SampleData>} />
            <Route path="/admin/ai-settings" element={<SampleData><AdminAISettings /></SampleData>} />
            <Route path="/admin-prompts/:promptId" element={<SampleData><AdminPromptDetail /></SampleData>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier-catalog" element={<SupplierCatalog />} />
            <Route path="/supplier-products/:productId" element={<SupplierProductDetail />} />
            <Route path="/supplier-products/new" element={<SupplierProductForm />} />
            <Route path="/supplier-products/:productId/edit" element={<SupplierProductForm />} />
            <Route path="/supplier-application" element={<SupplierApplicationStatus />} />
            <Route path="/supplier-inquiries" element={<SampleData><SupplierInquiries /></SampleData>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['designer']} />}>
            <Route path="/designer/projects" element={<ProjectList />} />
            <Route path="/designer/projects/:id" element={<ProjectDetail />} />
            <Route path="/designer-catalog" element={<DesignerCatalog />} />
            <Route path="/designer-ai-studio" element={<SampleData><DesignerAIStudio /></SampleData>} />
            <Route path="/designer-portfolio" element={<SampleData><DesignerPortfolio /></SampleData>} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['homeowner']} />}>
            <Route path="/homeowner/projects" element={<ProjectList />} />
            <Route path="/homeowner/projects/:id" element={<ProjectDetail />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['homeowner', 'designer', 'staff', 'admin']} />}>
            <Route path="/projects/:projectId/workspace" element={<WorkspacePage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
            <Route path="/settings" element={<ProfileSettings />} />
          </Route>
          {/* Old paths of pages that now have a real replacement */}
          {[
            ['/staff-dashboard', '/staff/projects'], ['/staff-projects', '/staff/projects'], ['/staff-project-detail', '/staff/projects'],
            ['/staff-requests', '/staff/projects'], ['/staff-request-detail', '/staff/projects'],
            ['/designer-projects', '/designer/projects'], ['/designer-projects/:projectId', '/designer/projects'],
            ['/homeowner-dashboard', '/homeowner/projects'], ['/homeowner-projects', '/homeowner/projects'],
          ].map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}

          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full absolute inset-0"
              >
                <LoginPage onNavigateToSignUp={() => navigate('/signup')} />
              </motion.div>
            }
          />

          <Route
            path="/signup"
            element={
              <motion.div
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="w-full h-full absolute inset-0"
              >
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
