export type UserRole = 'homeowner' | 'staff' | 'supplier' | 'admin' | 'designer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  badgeTitle?: string; // Ví dụ: "Staff", "Supplier Partner", "Studio Designer", "Admin"
}

// Cấu hình Route mặc định & Navigation Navbar cho từng Role.
// defaultPath là nơi Logo/redirect-sau-login đưa người dùng tới: Trang chủ chung ('/') cho mọi role, riêng Admin vào thẳng Dashboard.
export const ROLE_CONFIG: Record<UserRole, { defaultPath: string; badge: string; navItems: { label: string; path: string }[] }> = {
  homeowner: {
    defaultPath: '/',
    badge: 'Homeowner',
    navItems: [
      { label: 'Dashboard', path: '/homeowner-dashboard' },
      { label: 'My Projects', path: '/homeowner-projects' },
      { label: 'AI Studio', path: '/homeowner-ai-studio' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  staff: {
    defaultPath: '/',
    badge: 'Staff',
    navItems: [
      { label: 'Dashboard', path: '/staff-dashboard' },
      { label: 'Requests', path: '/staff-requests' },
      { label: 'Contracts', path: '/staff-contracts' },
      { label: 'Projects', path: '/staff-projects' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  designer: {
    defaultPath: '/',
    badge: 'Studio Designer',
    navItems: [
      { label: 'My Projects', path: '/designer-projects' },
      { label: 'AI Studio', path: '/designer-ai-studio' },
      { label: 'Catalog', path: '/designer-catalog' },
      { label: 'Messages', path: '/messages' },
    ],
  },
  supplier: {
    defaultPath: '/',
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
      { label: 'Master Data', path: '/admin-master-data' },
      { label: 'AI Settings', path: '/admin-ai-settings' },
      { label: 'Reports', path: '/admin-reports' },
      { label: 'Messages', path: '/messages' },
    ],
  },
};
