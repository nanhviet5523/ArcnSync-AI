import { t } from '@/i18n';
import type { User, UserRole } from '@/types/role';

/** The 7 steps shown on the landing page: the same backend-status steps as the project pages. */
export { PROJECT_STEPS } from '@/features/projects/steps';

/** Where a signed-in visitor continues from the landing page: their own projects (or dashboard), never a login prompt. */
const START: Record<UserRole, { to: string; label: string }> = {
  homeowner: { to: '/homeowner/projects', label: 'home.cta.myProjects' },
  designer: { to: '/designer/projects', label: 'home.cta.myProjects' },
  staff: { to: '/staff/projects', label: 'home.cta.myProjects' },
  supplier: { to: '/supplier-dashboard', label: 'home.cta.myDashboard' },
  admin: { to: '/admin-dashboard', label: 'home.cta.myDashboard' },
};

export const startFor = (user: User) => ({ to: START[user.role].to, label: t(START[user.role].label) });

/** Call-to-action links (react-router Links styled as large buttons). */
const ctaBase = 'inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
export const ctaPrimary = `${ctaBase} bg-brand text-white shadow-card hover:bg-brand-hover`;
export const ctaSecondary = `${ctaBase} border border-line-strong bg-surface text-slate-800 hover:bg-slate-100`;
