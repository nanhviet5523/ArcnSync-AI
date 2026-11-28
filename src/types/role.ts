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

// Landing path after login / on logo click: the shared homepage for everyone, except admin who lands on the dashboard.
// navItems drive the role-based Header menu (skill ui-nghiep-vu §2, only pages that exist).
type RoleNavItem = { label: string; path: string; children?: { label: string; path: string }[] };

export const ROLE_CONFIG: Record<UserRole, { defaultPath: string; badge: string; navItems: RoleNavItem[] }> = {
  homeowner: {
    defaultPath: '/',
    badge: t('role.homeowner'),
    navItems: [
      { label: t('nav.myProjects'), path: '/homeowner/projects' },
      { label: t('nav.myProperties'), path: '/homeowner-apartments' },
      { label: t('nav.paymentHistory'), path: '/payments/history' },
      { label: t('nav.messages'), path: '/messages' },
      { label: t('nav.profileSettings'), path: '/settings' },
    ],
  },
  staff: {
    defaultPath: '/',
    badge: 'Staff',
    navItems: [
      { label: t('nav.projects'), path: '/staff/projects' },
      { label: t('nav.apartments'), path: '/staff-apartments' },
      { label: t('nav.customers'), path: '/customers' },
      { label: t('nav.paymentHistory'), path: '/payments/history' },
      { label: t('nav.inquiries'), path: '/staff/inquiries' },
      { label: t('nav.reviews'), path: '/reviews' },
      { label: t('nav.messages'), path: '/messages' },
      { label: t('nav.profileSettings'), path: '/settings' },
    ],
  },
  designer: {
    defaultPath: '/',
    badge: t('role.designer'),
    navItems: [
      { label: t('nav.assignedProjects'), path: '/designer/projects' },
      { label: t('nav.catalog'), path: '/designer-catalog' },
      { label: t('nav.reviews'), path: '/reviews' },
      { label: t('nav.messages'), path: '/messages' },
      { label: t('nav.profileSettings'), path: '/settings' },
    ],
  },
  supplier: {
    defaultPath: '/',
    badge: t('role.supplier'),
    navItems: [
      { label: t('nav.dashboard'), path: '/supplier-dashboard' },
      { label: t('nav.products'), path: '/supplier-catalog' },
      { label: 'Application status', path: '/supplier-application' },
      { label: t('nav.messages'), path: '/messages' },
      { label: t('nav.profileSettings'), path: '/settings' },
    ],
  },
  admin: {
    defaultPath: '/admin-dashboard',
    badge: 'Admin',
    navItems: [
      { label: 'Dashboard', path: '/admin-dashboard' },
      { label: 'Projects', path: 'group:admin-projects', children: [
        { label: t('nav.projects'), path: '/staff/projects' },
        { label: t('nav.apartments'), path: '/admin-apartments' },
      ] },
      { label: 'People', path: 'group:admin-people', children: [
        { label: 'Users & Roles', path: '/admin-users' },
        { label: 'Customers', path: '/customers' },
      ] },
      { label: 'Product catalog', path: 'group:admin-catalog', children: [
        { label: 'Products', path: '/admin-products' },
        { label: 'Product categories', path: '/admin/categories' },
      ] },
      { label: 'Data & Knowledge', path: 'group:admin-data', children: [
        { label: 'Master Data', path: '/admin-master-data' },
        { label: 'AI Knowledge', path: '/admin/ai-knowledge' },
      ] },
      { label: 'Payments & Feedback', path: 'group:admin-activity', children: [
        { label: t('nav.paymentHistory'), path: '/payments/history' },
        { label: t('nav.inquiries'), path: '/staff/inquiries' },
        { label: t('nav.reviews'), path: '/reviews' },
      ] },
      { label: t('nav.profileSettings'), path: '/settings' },
    ],
  },
};
