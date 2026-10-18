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

// Default routes and navbar navigation for each role.
export const ROLE_CONFIG: Record<UserRole, { defaultPath: string; badge: string; navItems: { label: string; path: string }[] }> = {
  homeowner: {
    defaultPath: '/homeowner-dashboard',
    badge: 'Homeowner',
    navItems: [
      { label: 'Dashboard', path: '/homeowner-dashboard' },
      { label: 'My Projects', path: '/homeowner-projects' },
      { label: 'AI Studio', path: '/homeowner-ai-studio' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  staff: {
    defaultPath: '/staff-dashboard',
    badge: 'Staff',
    navItems: [
      { label: 'Dashboard', path: '/staff-dashboard' },
      { label: 'Requests', path: '/staff-requests' },
      { label: 'Contracts', path: '/staff-contracts' },
      { label: 'Projects', path: '/staff-projects' },
      { label: 'Customers', path: '/customers' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  designer: {
    defaultPath: '/designer-projects',
    badge: 'Studio Designer',
    navItems: [
      { label: 'My Projects', path: '/designer-projects' },
      { label: 'AI Studio', path: '/designer-ai-studio' },
      { label: 'Catalog', path: '/designer-catalog' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  supplier: {
    defaultPath: '/supplier-dashboard',
    badge: 'Supplier Partner',
    navItems: [
      { label: 'Dashboard', path: '/supplier-dashboard' },
      { label: 'Catalog', path: '/supplier-catalog' },
      { label: 'Inquiries', path: '/supplier-inquiries' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  admin: {
    defaultPath: '/admin-dashboard',
    badge: 'Admin',
    navItems: [
      { label: 'Dashboard', path: '/admin-dashboard' },
      { label: 'Users & Roles', path: '/admin-users' },
      { label: 'Products', path: '/admin-products' },
      { label: 'Master Data', path: '/admin-master-data' },
      { label: 'AI Settings', path: '/admin-ai-settings' },
      { label: 'Reports', path: '/admin-reports' },
      { label: 'Customers', path: '/customers' },
      { label: 'Messages', path: '/messages' },
    ],
  },
};
