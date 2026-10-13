import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/common';
import { getCurrentDemoUser, logoutDemo } from '@/services/authService';
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentUser = getCurrentDemoUser();

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

  // If on landing home page and no authenticated role
  if (!detectedRole || (location.pathname === '/' && !role)) {
    return (
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="cursor-pointer transition-opacity hover:opacity-90"
            aria-label="ArchSync AI home"
          >
            <Logo size={32} />
          </button>

          <nav className="hidden lg:flex gap-8 text-sm font-medium text-slate-700" aria-label="Main">
            {publicLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/');
                  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
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
      const normalizedLabel = itemLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedLabel.includes(normalizedTab) || normalizedTab.includes(normalizedLabel)) {
        return true;
      }
    }

    if (path === itemPath) return true;

    // Admin alias routes matching Figma
    if (detectedRole === 'admin') {
      if (
        itemLabel === 'Dashboard' &&
        (path === '/admin-dashboard' || path === '/admin/overview' || path === '/admin/dashboard')
      ) {
        return true;
      }
      if (
        itemLabel === 'Users & Roles' &&
        (path === '/admin-users' || path === '/admin/users' || path === '/admin/roles' || path === '/admin')
      ) {
        return true;
      }
      if (itemLabel === 'Master Data' && (path === '/admin-master-data' || path === '/admin/master-data')) {
        return true;
      }
      if (
        itemLabel === 'AI Settings' &&
        (path === '/admin-ai-settings' || path === '/admin/ai-settings' || path.startsWith('/admin-prompts/'))
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
      (path.startsWith('/supplier-products/') || path === '/supplier-catalog/import')
    ) {
      return true;
    }
    if (itemPath === '/designer-projects' && /^\/designer-projects\//.test(path)) {
      return true;
    }

    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-10">
          <div
            className="cursor-pointer transition-opacity hover:opacity-90 shrink-0"
            onClick={() => navigate(config.defaultPath)}
            title="ArchSync AI"
          >
            <Logo size={32} />
          </div>

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

          <button
            type="button"
            title="Notifications"
            className="relative w-8.5 h-8.5 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-slate-900 rounded-full" />
          </button>

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
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logoutDemo();
                      navigate('/');
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
