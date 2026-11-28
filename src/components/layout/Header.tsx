import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/common';
import { roleBadgeClass } from '@/components/ui/status';
import { t } from '@/i18n';
import { getCurrentUser, logout } from '@/services/authService';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';
import { SectionLink } from './SectionLink';
import { useDetectedRole } from './useDetectedRole';

export interface HeaderProps {
  role?: UserRole;
  activeTab?: string;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

/** Guest tabs: sections of the landing page, by element id. */
const publicLinks = [
  { label: t('home.nav.hero'), hash: '#hero' },
  { label: t('home.nav.howItWorks'), hash: '#how-it-works' },
  { label: t('home.nav.features'), hash: '#features' },
  { label: t('home.nav.contact'), hash: '#contact' },
];

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

  // Notification API is not wired here yet; keep the menu empty rather than showing sample data.
  const notifications: { id: string; title: string; time: string; unread: boolean }[] = [];
  const unreadCount = 0;

  const initials = role === 'admin' ? 'AD'
    : currentUser?.name
      ? currentUser.name.trim().split(/\s+/).map((part) => part[0]?.toUpperCase()).slice(0, 2).join('')
      : FALLBACK_INITIALS[role];

  return (
    <div className="flex shrink-0 items-center gap-3">
      {showBadge && (
        <span className={`select-none rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClass(role)}`}>{config.badge}</span>
      )}

      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          aria-expanded={notifOpen}
          aria-label="Open notifications menu"
          title="Notifications"
          className={`relative flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full border border-line transition focus-visible:outline-2 focus-visible:outline-brand ${notifOpen ? 'bg-sand-100 text-ink' : 'text-slate-700 hover:bg-sand-50'}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 z-[80] w-80 rounded-card border border-line bg-surface p-4 shadow-float sm:w-96">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
            </div>
            <div className="mt-1 divide-y divide-slate-100">
              {notifications.length === 0 ? <p className="py-5 text-center text-sm text-slate-500">{t('header.noNotifications')}</p> : notifications.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-2 last:pb-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold leading-snug text-slate-800">{item.title}</p>
                    <p className="mt-1 text-[11px] text-subtext">{item.time}</p>
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
              <p className="text-sm font-bold text-ink">{currentUser?.name ?? config.badge}</p>
              <p className="mt-0.5 text-xs text-slate-500">{currentUser?.email ?? `${config.badge} Account`}</p>
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

/** Role navigation wraps cleanly instead of making the whole page scroll sideways. */
function SlidingNav({ label, items, activeIndex, onSelect }: {
  label: string;
  items: { label: string; path: string; children?: { label: string; path: string }[] }[];
  activeIndex: number;
  onSelect: (path: string) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  return (
    <nav className="flex min-h-16 min-w-0 flex-1 items-center overflow-visible" aria-label={label}>
      <div className="relative flex min-h-16 w-full flex-wrap items-center gap-x-1 text-sm text-[#2E2A24]">
        {items.map((item, i) => {
          const active = i === activeIndex;
          return (
            <div key={item.path} className="relative flex min-h-16 items-center">
              <button
                type="button"
                onClick={() => item.children ? setOpenGroup((open) => open === item.path ? null : item.path) : onSelect(item.path)}
                aria-current={active ? 'page' : undefined}
                aria-expanded={item.children ? openGroup === item.path : undefined}
                aria-haspopup={item.children ? 'menu' : undefined}
                data-label={item.label}
                className={`group relative flex min-h-10 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-md px-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#556B3A] sm:px-3 xl:px-4 ${active ? 'font-semibold' : 'font-normal'}`}
              >
                {item.label}
                {item.children && <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform ${openGroup === item.path ? 'rotate-180' : ''}`} />}
                {active && <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-xs bg-[#556B3A]" />}
                {!active && <span aria-hidden className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-xs bg-[#556B3A] opacity-0 transition-opacity duration-200 group-hover:opacity-30 motion-reduce:transition-none" />}
              </button>
              {item.children && openGroup === item.path && <div role="menu" aria-label={item.label} className="absolute left-0 top-[calc(100%-0.5rem)] z-[80] min-w-52 rounded-xl border border-line bg-surface p-1.5 shadow-float">
                {item.children.map((child) => <button key={child.path} type="button" role="menuitem" onClick={() => { setOpenGroup(null); onSelect(child.path); }} className="flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-ink hover:bg-sand-50 focus-visible:outline-2 focus-visible:outline-brand">{child.label}</button>)}
              </div>}
            </div>
          );
        })}
      </div>
    </nav>
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
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-6 sm:gap-6 lg:px-12">
          <Logo size={32} to="/" tone="brandMark" />
          <nav className="hidden gap-6 text-sm font-medium md:flex lg:gap-8" aria-label="Main">
            {publicLinks.map(({ label, hash }) => (
              <SectionLink
                key={hash}
                hash={hash}
                className="rounded text-slate-600 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {label}
              </SectionLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="outline" onClick={onLoginClick ?? (() => navigate('/login'))}>Login</Button>
            <Button variant="primary" onClick={onSignUpClick ?? (() => navigate('/signup'))}>Sign Up</Button>
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
    // Trang theo dự án dùng chung mọi vai (vd /projects/:id/quotation) thuộc mục dự án của vai đó
    if (path.startsWith('/projects/') && itemPath.endsWith('/projects')) return true;

    // Admin alias routes matching Figma
    if (detectedRole === 'admin') {
      if (itemLabel === 'Dashboard' && (path === '/admin-dashboard' || path === '/admin/overview' || path === '/admin/dashboard')) return true;
      if (itemLabel === 'Users & Roles' && (path === '/admin-users' || path === '/admin/users' || path === '/admin/roles' || path === '/admin')) return true;
      if (itemLabel === 'Master Data' && (path === '/admin-master-data' || path === '/admin/master-data')) return true;
    }

    // Supplier & Designer sub-routes
    return (
      (itemPath === '/supplier-catalog' && (path.startsWith('/supplier-products/') || path === '/supplier-catalog/import')) ||
      (itemPath === '/designer-projects' && /^\/designer-projects\//.test(path))
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-4 px-6 lg:px-12">
        <div className="flex min-h-16 min-w-0 flex-[1_1_600px] items-center gap-3 xl:gap-6">
          <Logo size={32} to={config.defaultPath} tone="brandMark" />

          <SlidingNav
            label={`${config.badge} navigation`}
            items={config.navItems}
            activeIndex={config.navItems.findIndex((item) => item.children?.some((child) => isNavItemActive(child.path, child.label)) || isNavItemActive(item.path, item.label))}
            onSelect={(path) => navigate(path)}
          />
        </div>

        <UserMenus role={detectedRole} />
      </div>
    </header>
  );
};

export default Header;
