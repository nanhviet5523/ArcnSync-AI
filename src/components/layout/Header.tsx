import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut } from 'lucide-react';
import { Button, Logo } from '@/components/common';
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

const BADGE_STYLE: Record<UserRole, string> = {
  admin: 'bg-sand-100 text-ink',
  designer: 'bg-sand-100 text-ink',
  staff: 'bg-sand-100 text-ink',
  supplier: 'bg-sand-100 text-ink',
  homeowner: 'bg-sand-100 text-ink',
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

  const menuItem = 'flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-sand-50';

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
          className={`relative flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full border border-line transition focus-visible:outline-2 focus-visible:outline-brand ${notifOpen ? 'bg-sand-100 text-ink' : 'text-slate-700 hover:bg-sand-50'}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 z-[80] w-80 rounded-card border border-line bg-surface p-4 shadow-float sm:w-96">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllAsRead} className="cursor-pointer text-xs font-semibold text-brand hover:underline">Mark all as read</button>
              )}
            </div>
            <div className="mt-1 divide-y divide-slate-100">
              {notifications.map((item) => (
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
            <div className="py-1">
              <button type="button" className={menuItem} onClick={() => { setAccountOpen(false); navigate('/settings'); }}>
                <Settings className="h-3.5 w-3.5 text-slate-500" />
                <span>Profile &amp; Settings</span>
              </button>
              {role === 'supplier' && (
                <button type="button" className={menuItem} onClick={() => { setAccountOpen(false); navigate('/supplier-application'); }}>Application status</button>
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

/** Where the indicator sat on the previous page: pages render their own Header, so the new one starts there and slides. */
let lastIndicator: { x: number; width: number } | null = null;

/**
 * Role tabs: plain text on the header, same colour; the active one is bold. ONE 2px olive underline at the bottom of
 * the header slides (translateX + width, padding included) to the tab of the current route. First load or reload: it is placed at once, no slide. Re-measured on resize and
 * once web fonts are ready. Reduced motion: it jumps. No active tab (a page outside the menu): no indicator.
 */
function SlidingNav({ label, items, activeIndex, onSelect }: {
  label: string;
  items: { label: string; path: string }[];
  activeIndex: number;
  onSelect: (path: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Start where the previous page left it (null after a reload): the first measure then slides from there.
  const [indicator, setIndicator] = useState(activeIndex >= 0 ? lastIndicator : null);
  const [animate, setAnimate] = useState(false);
  const animateRef = useRef(false);

  useLayoutEffect(() => {
    const measure = () => {
      const el = buttonRefs.current[activeIndex];
      const next = el ? { x: el.offsetLeft, width: el.offsetWidth } : null;
      if (next) lastIndicator = next;
      return next;
    };

    let frame = 0;
    const next = measure();
    if (animateRef.current || !next) {
      setIndicator(next);
    } else {
      // Not animating yet: paint the starting point first, then turn the transition on (and move, if it came from
      // the previous page). Two frames so the browser has painted the start before the change.
      const from = indicator;
      if (!from) setIndicator(next);
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          animateRef.current = true;
          setAnimate(true);
          setIndicator(measure());
        });
      });
    }

    // Before the transition is on, the frames above place it (a ResizeObserver's first call would skip the slide).
    const remeasure = () => { if (animateRef.current) setIndicator(measure()); };
    const track = trackRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && track ? new ResizeObserver(remeasure) : null;
    if (track) observer?.observe(track);
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) remeasure(); });

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
    // `indicator` is read only as the starting point on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items]);

  // Keep the current tab in view when the menu scrolls sideways on narrow screens.
  useEffect(() => {
    buttonRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeIndex]);

  return (
    <nav className="flex h-full min-w-0 items-stretch overflow-x-auto" aria-label={label}>
      <div ref={trackRef} className="relative flex h-full items-stretch gap-1 text-sm text-[#2E2A24]">
        {indicator && (
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 z-10 h-0.5 rounded-xs bg-[#556B3A] motion-reduce:transition-none!"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.x}px)`,
              transition: animate
                ? 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                : 'none',
            }}
          />
        )}
        {items.map((item, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={item.path}
              ref={(el) => { buttonRefs.current[i] = el; }}
              type="button"
              onClick={() => onSelect(item.path)}
              aria-current={active ? 'page' : undefined}
              data-label={item.label}
              // flex-col + the hidden bold copy (::after): the tab is always as wide as its bold label, so going bold
              // never pushes the neighbours.
              className={`group relative flex cursor-pointer flex-col items-center justify-center whitespace-nowrap rounded-md px-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#556B3A] after:invisible after:block after:h-0 after:overflow-hidden after:font-semibold after:content-[attr(data-label)] ${
                active ? 'font-semibold' : 'font-normal'
              }`}
            >
              {item.label}
              {/* Hover hint on the other tabs: a faint underline (the real one slides over the active tab). */}
              {!active && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 rounded-xs bg-[#556B3A] opacity-0 transition-opacity duration-200 group-hover:opacity-30 motion-reduce:transition-none"
                />
              )}
            </button>
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
          <Logo size={32} to="/" />
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
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 lg:px-12">
        <div className="flex h-full min-w-0 items-center gap-8">
          <Logo size={32} to={config.defaultPath} />

          <SlidingNav
            label={`${config.badge} navigation`}
            items={config.navItems}
            activeIndex={config.navItems.findIndex((item) => isNavItemActive(item.path, item.label))}
            onSelect={(path) => navigate(path)}
          />
        </div>

        <UserMenus role={detectedRole} />
      </div>
    </header>
  );
};

export default Header;
