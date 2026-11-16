import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/common';
import { getCurrentUser, logout } from '@/services/authService';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';
import { useDetectedRole } from './useDetectedRole';

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

const BADGE_STYLE: Record<UserRole, string> = {
  admin: 'bg-amber-100/90 text-amber-900',
  designer: 'bg-cyan-100/70 text-cyan-900',
  staff: 'bg-teal-50 text-teal-700',
  supplier: 'bg-purple-50 text-purple-700',
  homeowner: 'bg-slate-100 text-slate-700',
};

const FALLBACK_INITIALS: Record<UserRole, string> = { admin: 'AD', designer: 'NL', staff: 'TN', supplier: 'NV', homeowner: 'MA' };

/** Close a dropdown when the user clicks outside it. */
function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, close]);
  return ref;
}

/** Role chip, notification bell and avatar menu. Shared by the app Header and the design workspace bar. */
export function UserMenus({ role, showBadge = true }: { role: UserRole; showBadge?: boolean }) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const config = ROLE_CONFIG[role];
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useOutside(accountOpen, () => setAccountOpen(false));
  const notifRef = useOutside(notifOpen, () => setNotifOpen(false));

  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Image generation is slower than usual', time: '2 hours ago', unread: true },
    { id: 'n2', title: 'Viglacera Tiles has not accepted the invitation yet', time: 'Yesterday', unread: true },
    { id: 'n3', title: 'Pham Duc role changed to Designer', time: 'Yesterday', unread: false },
  ]);
  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllAsRead = () => setNotifications((prev) => prev.map((item) => ({ ...item, unread: false })));

  const initials = role === 'admin' ? 'AD'
    : currentUser?.name
      ? currentUser.name.trim().split(/\s+/).map((part) => part[0]?.toUpperCase()).slice(0, 2).join('')
      : FALLBACK_INITIALS[role];

  const menuItem = 'flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50';

  return (
    <div className="flex shrink-0 items-center gap-3">
      {showBadge && (
        <span className={`select-none rounded-full px-3 py-1 text-xs font-semibold ${BADGE_STYLE[role]}`}>{config.badge}</span>
      )}

      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          aria-expanded={notifOpen}
          aria-label="Open notifications menu"
          title="Notifications"
          className={`relative flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full border border-line transition focus-visible:outline-2 focus-visible:outline-brand ${notifOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 z-[80] w-80 rounded-card border border-line bg-surface p-4 shadow-float sm:w-96">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="cursor-pointer text-xs font-semibold text-brand hover:underline">Mark all as read</button>
              )}
            </div>
            <div className="mt-1 divide-y divide-slate-100">
              {notifications.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-2 last:pb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{item.time}</p>
                  </div>
                  {item.unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setAccountOpen((o) => !o)}
          aria-expanded={accountOpen}
          aria-label="Open account menu"
          title="Account profile"
          className="flex h-8.5 w-8.5 cursor-pointer select-none items-center justify-center rounded-full bg-navy text-xs font-bold text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {initials}
        </button>

        {accountOpen && (
          <div className="absolute right-0 top-11 z-[80] w-56 rounded-card border border-line bg-surface py-2 shadow-float">
            <div className="border-b border-line px-4 py-2.5">
              <p className="text-sm font-bold text-slate-900">{currentUser?.name ?? config.badge}</p>
              <p className="mt-0.5 text-xs text-slate-500">{currentUser?.email ?? `${config.badge} Account`}</p>
            </div>
            <div className="py-1">
              <button type="button" className={menuItem} onClick={() => { setAccountOpen(false); navigate('/settings'); }}>
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Profile &amp; Settings</span>
              </button>
              {role === 'supplier' && (
                <button type="button" className={menuItem} onClick={() => { setAccountOpen(false); navigate('/supplier-application'); }}>Application status</button>
              )}
              {role === 'designer' && (
                <button type="button" className={menuItem} onClick={() => { setAccountOpen(false); navigate('/designer-portfolio'); }}>My Portfolio</button>
              )}
            </div>
            <div className="border-t border-line pt-1">
              <button
                type="button"
                onClick={async () => { setAccountOpen(false); await logout(); navigate('/login', { replace: true }); }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Header: React.FC<HeaderProps> = ({ role, activeTab, onLoginClick, onSignUpClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const detectedRole = useDetectedRole(role);

  // Guest (no session): public header. Signed-in users get their role menu, also on the homepage.
  if (!detectedRole) {
    return (
      <header className="sticky top-0 z-50 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-6 px-6 lg:px-12">
          <Logo size={32} to="/" />
          <nav className="hidden gap-8 text-sm font-medium text-slate-700 lg:flex" aria-label="Main">
            {publicLinks.map(([label, href]) => (
              <a
                key={label}
                href={href}
                onClick={(event) => {
                  event.preventDefault();
                  navigate('/');
                  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onLoginClick}>Login</Button>
            <Button variant="primary" onClick={onSignUpClick}>Sign Up</Button>
          </div>
        </div>
      </header>
    );
  }

  const config = ROLE_CONFIG[detectedRole];

  const isNavItemActive = (itemPath: string, itemLabel: string) => {
    const path = location.pathname;

    if (activeTab) {
      const normalizedTab = activeTab.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedLabel = itemLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedLabel.includes(normalizedTab) || normalizedTab.includes(normalizedLabel)) return true;
    }

    if (path === itemPath) return true;
    // Trang con của trang thật, vd /staff/projects/:id, /homeowner/projects/:id
    if (path.startsWith(`${itemPath}/`)) return true;

    // Admin alias routes matching Figma
    if (detectedRole === 'admin') {
      if (itemLabel === 'Dashboard' && (path === '/admin-dashboard' || path === '/admin/overview' || path === '/admin/dashboard')) return true;
      if (itemLabel === 'Users & Roles' && (path === '/admin-users' || path === '/admin/users' || path === '/admin/roles' || path === '/admin')) return true;
      if (itemLabel === 'Master Data' && (path === '/admin-master-data' || path === '/admin/master-data')) return true;
      if (itemLabel === 'AI Settings' && (path === '/admin-ai-settings' || path === '/admin/ai-settings' || path.startsWith('/admin-prompts/'))) return true;
      if (itemLabel === 'Reports' && path === '/admin-reports') return true;
    }

    // Supplier & Designer sub-routes
    return (
      (itemPath === '/admin-ai-settings' && path.startsWith('/admin-prompts/')) ||
      (itemPath === '/supplier-catalog' && (path.startsWith('/supplier-products/') || path === '/supplier-catalog/import')) ||
      (itemPath === '/designer-projects' && /^\/designer-projects\//.test(path))
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 lg:px-12">
        <div className="flex h-full items-center gap-10">
          <Logo size={32} to={config.defaultPath} />

          <nav className="flex h-full items-stretch gap-8 overflow-x-auto text-sm" aria-label={`${config.badge} navigation`}>
            {config.navItems.map((item) => {
              const active = isNavItemActive(item.path, item.label);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => navigate(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`cursor-pointer whitespace-nowrap border-b-2 pt-0.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                    active ? 'border-brand font-semibold text-brand' : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <UserMenus role={detectedRole} />
      </div>
    </header>
  );
};

export default Header;
