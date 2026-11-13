
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/common';
import { getCurrentUser, logout } from '@/services/authService';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';

export interface HeaderProps {
  role?: UserRole;
  activeTab?: string;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

const publicLinks = [
  ['Home', '#home'],
  ['Service', '#service'],
  ['How It Works', '#how-it-works'],
  ['Our Team', '#our-team'],
  ['Our Work', '#our-work'],
  ['Partners', '#partners'],
];

export const Header: React.FC<HeaderProps> = ({
  role,
  activeTab,
  onLoginClick,
  onSignUpClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Image generation is slower than usual',
      time: '2 hours ago',
      unread: true,
    },
    {
      id: 'n2',
      title: 'Viglacera Tiles has not accepted the invitation yet',
      time: 'Yesterday',
      unread: true,
    },
    {
      id: 'n3',
      title: 'Pham Duc role changed to Designer',
      time: 'Yesterday',
      unread: false,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, unread: false }))
    );
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const currentUser = getCurrentUser();

  // Auto-detect role from prop, current user session, or current path
  const detectedRole: UserRole | undefined =
    role ??
    currentUser?.role ??
    (location.pathname.startsWith('/admin')
      ? 'admin'
      : location.pathname.startsWith('/staff')
      ? 'staff'
      : location.pathname.startsWith('/designer')
      ? 'designer'
      : location.pathname.startsWith('/supplier')
      ? 'supplier'
      : location.pathname.startsWith('/homeowner')
      ? 'homeowner'
      : undefined);

  // Guest (chưa đăng nhập): header công khai. Đã đăng nhập -> hiện menu theo role, kể cả trên trang chủ.
  if (!detectedRole) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
          <Logo size={32} to="/" />

          <nav
            className="hidden lg:flex gap-8 text-sm font-medium text-slate-700"
            aria-label="Main"
          >
            {publicLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/');
                  document
                    .querySelector(href)
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onLoginClick}>
              Login
            </Button>
            <Button variant="primary" onClick={onSignUpClick}>
              Sign Up
            </Button>
          </div>
        </div>
      </header>
    );
  }

  const config = ROLE_CONFIG[detectedRole];

  const getBadgeStyle = (userRole: UserRole) => {
    switch (userRole) {
      case 'admin':
        return 'bg-amber-100/90 text-amber-900';
      case 'designer':
        return 'bg-cyan-100/70 text-cyan-900';
      case 'staff':
        return 'bg-teal-50 text-teal-700';
      case 'supplier':
        return 'bg-purple-50 text-purple-700';
      case 'homeowner':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getAvatarInitials = () => {
    if (detectedRole === 'admin') return 'AD';

    if (currentUser?.name) {
      return currentUser.name
        .trim()
        .split(/\s+/)
        .map((part) => part[0]?.toUpperCase())
        .slice(0, 2)
        .join('');
    }

    switch (detectedRole) {
      case 'designer':
        return 'NL';
      case 'staff':
        return 'TN';
      case 'supplier':
        return 'NV';
      case 'homeowner':
        return 'MA';
      default:
        return 'AD';
    }
  };

  const isNavItemActive = (itemPath: string, itemLabel: string) => {
    const path = location.pathname;

    if (activeTab) {
      const normalizedTab = activeTab.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedLabel = itemLabel
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (
        normalizedLabel.includes(normalizedTab) ||
        normalizedTab.includes(normalizedLabel)
      ) {
        return true;
      }
    }

    if (path === itemPath) return true;

    // Admin alias routes matching Figma
    if (detectedRole === 'admin') {
      if (
        itemLabel === 'Dashboard' &&
        (path === '/admin-dashboard' ||
          path === '/admin/overview' ||
          path === '/admin/dashboard')
      ) {
        return true;
      }

      if (
        itemLabel === 'Users & Roles' &&
        (path === '/admin-users' ||
          path === '/admin/users' ||
          path === '/admin/roles' ||
          path === '/admin')
      ) {
        return true;
      }

      if (
        itemLabel === 'Master Data' &&
        (path === '/admin-master-data' || path === '/admin/master-data')
      ) {
        return true;
      }

      if (
        itemLabel === 'AI Settings' &&
        (path === '/admin-ai-settings' ||
          path === '/admin/ai-settings' ||
          path.startsWith('/admin-prompts/'))
      ) {
        return true;
      }

      if (itemLabel === 'Reports' && path === '/admin-reports') {
        return true;
      }
    }

    // Supplier & Designer sub-routes
    if (
      itemPath === '/supplier-catalog' &&
      (path.startsWith('/supplier-products/') ||
        path === '/supplier-catalog/import')
    ) {
      return true;
    }

    if (
      itemPath === '/designer-projects' &&
      /^\/designer-projects\//.test(path)
    ) {
      return true;
    }

    return (
      (itemPath === '/admin-ai-settings' &&
        path.startsWith('/admin-prompts/')) ||
      (itemPath === '/supplier-catalog' &&
        (path.startsWith('/supplier-products/') ||
          path === '/supplier-catalog/import')) ||
      (itemPath === '/designer-projects' &&
        /^\/designer-projects\//.test(path))
    );
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-10">
          <Logo size={32} to={config.defaultPath} />

          <nav
            className="flex items-center gap-8 text-sm overflow-x-auto"
            aria-label={`${config.badge} navigation`}
          >
            {config.navItems.map((item) => {
              const active = isNavItemActive(item.path, item.label);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`font-medium transition-colors cursor-pointer py-1 whitespace-nowrap ${
                    active
                      ? 'text-blue-600 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Role Badge, Notification Bell & User Avatar AD */}
        <div className="flex items-center gap-3.5 shrink-0">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full select-none ${getBadgeStyle(
              detectedRole
            )}`}
          >
            {config.badge}
          </span>

          {/* Notification Bell with Dropdown Menu */}
          <div className="relative" ref={notificationRef}>
            <button
              type="button"
              onClick={() => setNotificationMenuOpen((open) => !open)}
              aria-expanded={notificationMenuOpen}
              aria-label="Open notifications menu"
              title="Notifications"
              className={`relative w-8.5 h-8.5 rounded-full border border-slate-200/90 flex items-center justify-center transition cursor-pointer ${
                notificationMenuOpen
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
              )}
            </button>

            {notificationMenuOpen && (
              <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">
                    Notifications
                  </h3>

                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {/* Dropdown Items List */}
                <div className="divide-y divide-slate-100 mt-1">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-start justify-between gap-3 first:pt-2 last:pb-1"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 leading-snug">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {item.time}
                        </p>
                      </div>

                      {item.unread && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar with Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-expanded={accountMenuOpen}
              aria-label="Open account menu"
              title="Account profile"
              className="w-8.5 h-8.5 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-800 transition select-none shadow-xs"
            >
              {getAvatarInitials()}
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">
                    {currentUser?.name ?? config.badge}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentUser?.email ?? `${config.badge} Account`}
                  </p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-500" />
                    <span>Profile &amp; Settings</span>
                  </button>

                  {detectedRole === 'supplier' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/supplier-application');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      Application status
                    </button>
                  )}

                  {detectedRole === 'designer' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        navigate('/designer-portfolio');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      My Portfolio
                    </button>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setAccountMenuOpen(false);
                      await logout();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
