import { Navigate, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from '@/features/home/HomePage';
import { getCurrentUser } from '@/services/authService';
import { DEFAULT_ROLE_REDIRECT } from '@/routes/routes.config';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { VerifyOtpPage } from '@/features/auth/VerifyOtpPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { NoApiPage } from '@/features/auth/NoApiPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { AcceptInvitation } from '@/features/auth/AcceptInvitation';
import { HomeownerPayments } from '@/features/homeowner/HomeownerPayments';
import { PaymentHistoryPage } from '@/features/payments/PaymentHistoryPage';
import { ProfileSettings } from '@/features/shared/ProfileSettings';
import { MessagesPage } from '@/features/chat/MessagesPage';
import { ChatRealtimeProvider } from '@/features/chat/ChatRealtimeProvider';
import { CHAT_ROLES } from '@/features/chat/chatApi';
import { CustomerDirectory } from '@/features/shared/CustomerDirectory';
import { ApartmentManagement } from '@/features/shared/ApartmentManagement';
import { ContractDetail } from '@/features/projects/ContractDetail';
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
import { AdminDashboard } from '@/features/admin/AdminDashboard';
import { QuotationPage } from '@/features/quotations/QuotationPage';
import { ReviewsPage } from '@/features/reviews/ReviewsPage';
import { InquiriesPage } from '@/features/inquiries/InquiriesPage';
import { ContactPage } from '@/features/inquiries/ContactPage';
import { ProjectAiAssistant } from '@/features/ai/ProjectAiAssistant';
import { AdminKnowledgeChunks } from '@/features/ai/AdminKnowledgeChunks';
import { CreateContract } from '@/features/staff/CreateContract';
import { TermsPage } from '@/features/static/TermsPage';
import { PrivacyPage } from '@/features/static/PrivacyPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import type { UserRole } from '@/types/role';

const ALL_ROLES: UserRole[] = ['homeowner', 'designer', 'staff', 'supplier', 'admin'];

/** Redirect that keeps the query string, so old /create-contract?projectId=... links land on the new route. */
function RedirectKeepSearch({ to }: { to: string }) {
  const { search } = useLocation();
  return <Navigate to={{ pathname: to, search }} replace />;
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

  // overflow-x-clip, not -hidden: hidden makes this div the scroll container for position: sticky,
  // so the sticky Header (and other sticky panels) would scroll away with the page.
  return (
    <ChatRealtimeProvider>
      <div
        className={`w-full bg-white relative ${
          isAuthPage ? 'h-screen overflow-hidden' : 'min-h-screen overflow-x-clip'
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
            <Route path="/staff/inquiries" element={<InquiriesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin', 'designer']} />}>
            <Route path="/reviews" element={<ReviewsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
            <Route path="/staff-apartments" element={<ApartmentManagement />} />
            <Route path="/create-contract" element={<RedirectKeepSearch to="/staff-create-contract" />} />
            <Route path="/staff-create-contract" element={<CreateContract />} />
            <Route path="/staff-edit-contract" element={<CreateContract />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin-apartments" element={<ApartmentManagement />} />
            <Route path="/admin-users" element={<AdminUsersPage />} />
            <Route path="/admin/categories" element={<AdminCategories />} />
            <Route path="/admin-master-data" element={<AdminMasterData />} />
            <Route path="/admin-products" element={<AdminProducts />} />
            <Route path="/admin" element={<AdminUsersPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/roles" element={<AdminUsersPage />} />
            <Route path="/admin/master-data" element={<AdminMasterData />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin/overview" element={<AdminDashboard />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/ai-knowledge" element={<AdminKnowledgeChunks />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['supplier']} />}>
            <Route path="/supplier-dashboard" element={<SupplierDashboard />} />
            <Route path="/supplier-catalog" element={<SupplierCatalog />} />
            <Route path="/supplier-products/:productId" element={<SupplierProductDetail />} />
            <Route path="/supplier-products/new" element={<SupplierProductForm />} />
            <Route path="/supplier-products/:productId/edit" element={<SupplierProductForm />} />
            <Route path="/supplier-application" element={<SupplierApplicationStatus />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['designer']} />}>
            <Route path="/designer/projects" element={<ProjectList />} />
            <Route path="/designer/projects/:id" element={<ProjectDetail />} />
            <Route path="/designer-catalog" element={<DesignerCatalog />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['homeowner']} />}>
            <Route path="/homeowner-apartments" element={<ApartmentManagement />} />
            <Route path="/homeowner/projects" element={<ProjectList />} />
            <Route path="/homeowner/projects/:id" element={<ProjectDetail />} />
            <Route path="/homeowner/payments" element={<HomeownerPayments />} />
            <Route path="/payments/result" element={<HomeownerPayments />} />
          </Route>
          {/* GET /payment-transactions: CUSTOMER, STAFF, ADMIN (designer gets 403, supplier has no payments) */}
          <Route element={<ProtectedRoute allowedRoles={['homeowner', 'staff', 'admin']} />}>
            <Route path="/payments/history" element={<PaymentHistoryPage />} />
          </Route>
          {/* Design workspace (design-versions APIs): every project role; actions gated by can() in design-workspace/logic.ts */}
          <Route element={<ProtectedRoute allowedRoles={['homeowner', 'designer', 'staff', 'admin']} />}>
            <Route path="/projects/:projectId/ai" element={<ProjectAiAssistant />} />
            <Route path="/projects/:projectId/workspace" element={<WorkspacePage />} />
            <Route path="/projects/:projectId/quotation" element={<QuotationPage />} />
          </Route>
          {/* Chat: everyone but admin (backend @Roles CUSTOMER, STAFF, DESIGNER, SUPPLIER; admin gets 403) */}
          <Route element={<ProtectedRoute allowedRoles={CHAT_ROLES} />}>
            <Route path="/messages" element={<MessagesPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={ALL_ROLES} />}>
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/project-contract" element={<ContractDetail />} />
          </Route>
          {/* Old paths of pages that now have a real replacement */}
          {[
            ['/staff-dashboard', '/staff/projects'], ['/staff-projects', '/staff/projects'], ['/staff-project-detail', '/staff/projects'],
            ['/staff-requests', '/staff/projects'], ['/staff-request-detail', '/staff/projects'],
            ['/designer-projects', '/designer/projects'], ['/designer-projects/:projectId', '/designer/projects'],
            ['/homeowner-dashboard', '/homeowner/projects'], ['/homeowner-projects', '/homeowner/projects'],
          ].map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
          {/* "/register" is what the landing-page spec calls the sign-up page */}
          <Route path="/register" element={<Navigate to="/signup" replace />} />

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

          {/* Retired info pages (old AI-era copy): the landing page covers them now */}
          <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
          {['/about', '/pricing', '/help'].map((path) => <Route key={path} path={path} element={<Navigate to="/" replace />} />)}
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/no-api" element={<NoApiPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/auth/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/accept-invite" element={<AcceptInvitation />} />
          <Route path="/activate-account" element={<AcceptInvitation />} />
        </Routes>
      </AnimatePresence>
      </div>
    </ChatRealtimeProvider>
  );
}

export default App;
