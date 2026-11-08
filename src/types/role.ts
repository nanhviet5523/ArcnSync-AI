import { t } from '@/i18n';

export type UserRole = 'homeowner' | 'staff' | 'supplier' | 'admin' | 'designer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  badgeTitle?: string; // For example: "Staff", "Supplier Partner", "Studio Designer", "Admin"
}

// Default routes and navbar navigation for each role (skill ui-nghiep-vu §2, only pages that exist).
export const ROLE_CONFIG: Record<UserRole, { defaultPath: string; badge: string; navItems: { label: string; path: string }[] }> = {
  homeowner: {
    defaultPath: '/homeowner/projects',
    badge: t('role.homeowner'),
    navItems: [
      { label: t('nav.myProjects'), path: '/homeowner/projects' },
      { label: t('nav.account'), path: '/settings' },
    ],
  },
  staff: {
    defaultPath: '/staff/projects',
    badge: 'Staff',
    navItems: [
      { label: t('nav.projects'), path: '/staff/projects' },
      { label: t('nav.contracts'), path: '/staff-contracts' },
      { label: t('nav.customers'), path: '/customers' },
      { label: t('nav.account'), path: '/settings' },
    ],
  },
  designer: {
    defaultPath: '/designer/projects',
    badge: t('role.designer'),
    navItems: [
      { label: t('nav.assignedProjects'), path: '/designer/projects' },
      { label: t('nav.aiStudio'), path: '/designer-ai-studio' },
      { label: t('nav.catalog'), path: '/designer-catalog' },
      { label: t('nav.account'), path: '/settings' },
    ],
  },
  supplier: {
    defaultPath: '/supplier-catalog',
    badge: t('role.supplier'),
    navItems: [
      { label: t('nav.dashboard'), path: '/supplier-dashboard' },
      { label: t('nav.products'), path: '/supplier-catalog' },
      { label: t('nav.inquiries'), path: '/supplier-inquiries' },
      { label: t('nav.account'), path: '/settings' },
    ],
  },
  admin: {
    defaultPath: '/admin-users',
    badge: 'Admin',
    navItems: [
      { label: 'Dashboard', path: '/admin-dashboard' },
      { label: 'Users & Roles', path: '/admin-users' },
      { label: 'Products', path: '/admin-products' },
      { label: 'Product categories', path: '/admin/categories' },
      { label: 'Master Data', path: '/admin-master-data' },
      { label: 'AI Settings', path: '/admin-ai-settings' },
      { label: 'Reports', path: '/admin-reports' },
      { label: 'Customers', path: '/customers' },
    ],
  },
};
