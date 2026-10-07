import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from '@/features/home/HomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { StaffWorkspace } from '@/features/staff/StaffWorkspace';
import { CreateContract } from '@/features/staff/CreateContract';
import { StaffProjects } from '@/features/staff/StaffProjects';
import { StaffProjectDetail } from '@/features/staff/StaffProjectDetail';
import { Messages } from '@/features/shared/Messages';
import { CallMeeting } from '@/features/shared/CallMeeting';
import { ProfileSettings } from '@/features/shared/ProfileSettings';
// import PlannerPage from '@/features/planner/PlannerPage';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

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
        ease: [0.25, 1, 0.5, 1],
      },
    },
    exit: {
      x: location.pathname === '/signup' ? -40 : 40,
      opacity: 0,
      transition: {
        duration: 0.25,
        ease: [0.25, 1, 0.5, 1],
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

          {/* Routes cho Staff */}
          <Route path="/staff-workspace" element={<StaffWorkspace />} />
          <Route path="/create-contract" element={<CreateContract />} />
          <Route path="/staff-project" element={<StaffProjects />} />
          <Route path="/staff-projects" element={<StaffProjects />} />
          <Route path="/staff-project-detail" element={<StaffProjectDetail />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/call-meeting" element={<CallMeeting />} />
          <Route path="/settings" element={<ProfileSettings />} />
          {/* <Route path="/planner" element={<PlannerPage />} /> */}
          
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
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;