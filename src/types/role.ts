export type UserRole = 'homeowner' | 'staff' | 'supplier' | 'admin' | 'designer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  badgeTitle?: string; // Ví dụ: "Staff", "Supplier Partner", "Studio Designer", "Admin"
}

// Cấu hình Route mặc định & Navigation Navbar cho từng Role
export const ROLE_CONFIG: Record<UserRole, { defaultPath: string; badge: string; navItems: { label: string; path: string }[] }> = {
  homeowner: {
    defaultPath: '/dashboard',
    badge: 'Homeowner',
    navItems: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'My Projects', path: '/projects' },
      { label: 'AI Studio', path: '/ai-studio' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  staff: {
    defaultPath: '/staff/workspace',
    badge: 'Staff',
    navItems: [
      { label: 'Dashboard', path: '/staff/workspace' },
      { label: 'Requests', path: '/staff/requests' },
      { label: 'Contracts', path: '/staff/contracts' },
      { label: 'Projects', path: '/staff/projects' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  designer: {
    defaultPath: '/designer/projects',
    badge: 'Studio Designer',
    navItems: [
      { label: 'My Projects', path: '/designer/projects' },
      { label: 'AI Studio', path: '/ai-studio' },
      { label: 'Catalog', path: '/catalog' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  supplier: {
    defaultPath: '/supplier/portal',
    badge: 'Supplier Partner',
    navItems: [
      { label: 'Dashboard', path: '/supplier/portal' },
      { label: 'Catalog', path: '/supplier/catalog' },
      { label: 'Inquiries', path: '/supplier/inquiries' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  admin: {
    defaultPath: '/admin/overview',
    badge: 'Admin',
    navItems: [
      { label: 'Dashboard', path: '/admin/overview' },
      { label: 'Users & Roles', path: '/admin/users' },
      { label: 'Master Data', path: '/admin/master-data' },
      { label: 'AI Settings', path: '/admin/ai-settings' },
    ],
  },
};