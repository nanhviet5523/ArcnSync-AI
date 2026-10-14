import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from '@/features/home/HomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { AcceptInvitation } from '@/features/auth/AcceptInvitation';
import { StaffDashboard } from '@/features/staff/StaffDashboard';
import { CreateContract } from '@/features/staff/CreateContract';
import { StaffRequests } from '@/features/staff/StaffRequests';
import { StaffRequestDetail } from '@/features/staff/StaffRequestDetail';
import { StaffContracts } from '@/features/staff/StaffContracts';
import { StaffContractDetail } from '@/features/staff/StaffContractDetail';
import { StaffAddendum } from '@/features/staff/StaffAddendum';
import { StaffProjects } from '@/features/staff/StaffProjects';
import { StaffProjectDetail } from '@/features/staff/StaffProjectDetail';
import { Messages } from '@/features/shared/Messages';
import { CallMeeting } from '@/features/shared/CallMeeting';
import { ProfileSettings } from '@/features/shared/ProfileSettings';
import { AdminUsersRoles } from '@/features/admin/AdminUsersRoles';
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { AdminMasterData } from '@/features/admin/AdminMasterData';
import { RolePreviewPage } from '@/features/shared/RolePreviewPage';
import { AdminAISettings } from '@/features/admin/AdminAISettings';
import { AdminPromptDetail } from '@/features/admin/AdminPromptDetail';
import { AdminReports } from '@/features/admin/AdminReports';
import { SupplierDashboard } from '@/features/supplier/SupplierDashboard';
import { SupplierCatalog } from '@/features/supplier/SupplierCatalog';
import { SupplierProductDetail } from '@/features/supplier/SupplierProductDetail';
import { SupplierProductForm } from '@/features/supplier/SupplierProductForm';
import { SupplierCatalogImport } from '@/features/supplier/SupplierCatalogImport';
import { SupplierInquiries } from '@/features/supplier/SupplierInquiries';
import { SupplierApplicationStatus } from '@/features/supplier/SupplierApplicationStatus';
import { DesignerProjects } from '@/features/designer/DesignerProjects';
import { DesignerProjectDetail } from '@/features/designer/DesignerProjectDetail';
import { DesignerAIStudio } from '@/features/designer/DesignerAIStudio';
import { DesignerPortfolio } from '@/features/designer/DesignerPortfolio';
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
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/staff-requests" element={<StaffRequests />} />
            <Route path="/staff-request-detail" element={<StaffRequestDetail />} />
            <Route path="/create-contract" element={<CreateContract />} />
            <Route path="/staff-contracts" element={<StaffContracts />} />
            <Route path="/staff-contract-detail" element={<StaffContractDetail />} />
            <Route path="/staff-addendum" element={<StaffAddendum />} />
            <Route path="/staff-projects" element={<StaffProjects />} />
            <Route path="/staff-project-detail" element={<StaffProjectDetail />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-users" element={<AdminUsersRoles />} />
            <Route path="/admin-master-data" element={<AdminMasterData />} />
            <Route path="/admin-ai-settings" element={<AdminAISettings />} />
            <Route path="/admin-prompts/:promptId" element={<AdminPromptDetail />} />
            <Route path="/admin-reports" element={<AdminReports />} />
            <Route path="/admin" element={<AdminUsersRoles />} />
            <Route path="/admin/users" element={<AdminUsersRoles />} />
            <Route path="/admin/roles" element={<AdminUsersRoles />} />
            <Route path="/admin/overview" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/master-data" element={<AdminMasterData />} />
            <Route path="/admin/ai-settings" element={<AdminAISettings />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier-catalog" element={<SupplierCatalog />} />
            <Route path="/supplier-products/:productId" element={<SupplierProductDetail />} />
            <Route path="/supplier-products/new" element={<SupplierProductForm />} />
            <Route path="/supplier-products/:productId/edit" element={<SupplierProductForm />} />
            <Route path="/supplier-catalog/import" element={<SupplierCatalogImport />} />
            <Route path="/supplier-inquiries" element={<SupplierInquiries />} />
            <Route path="/supplier-application" element={<SupplierApplicationStatus />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['designer']} />}>
            <Route path="/designer-projects" element={<DesignerProjects />} />
            <Route path="/designer-projects/:projectId" element={<DesignerProjectDetail />} />
            <Route path="/designer-ai-studio" element={<DesignerAIStudio />} />
            <Route path="/designer-catalog" element={<DesignerProjectDetail initialTab="Products" />} />
            <Route path="/designer-portfolio" element={<DesignerPortfolio />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
            <Route path="/messages" element={<Messages />} />
            <Route path="/call-meeting" element={<CallMeeting />} />
            <Route path="/settings" element={<ProfileSettings />} />
          </Route>
          {PREVIEW_ROLES.flatMap((role) =>
            ROLE_CONFIG[role].navItems
              .filter((item) => item.path !== '/messages')
              .map((item) => (
                <Route key={`${role}-${item.path}`} element={<ProtectedRoute allowedRoles={[role]} />}>
                  <Route path={item.path} element={<RolePreviewPage role={role} />} />
                </Route>
              )),
          )}
   
          
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

          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/auth/accept-invitation" element={<AcceptInvitation />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
