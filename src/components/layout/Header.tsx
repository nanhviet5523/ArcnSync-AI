import React, { useState } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Logo } from '@/components/common';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';
import { getCurrentDemoUser, logoutDemo } from '@/services/authService';

interface HeaderProps {
  role?: UserRole;
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

export const Header: React.FC<HeaderProps> = ({ role, onLoginClick, onSignUpClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  if (!role) {
    return (
      <header className="sticky top-0 z-50 flex items-center justify-between gap-6 px-6 lg:px-12 py-4 bg-white border-b border-slate-100">
        <button type="button" onClick={() => navigate('/')} aria-label="ArchSync AI home">
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
              className="text-slate-600 hover:text-slate-900 transition"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onLoginClick}>Login</Button>
          <Button variant="primary" onClick={onSignUpClick}>Sign Up</Button>
        </div>
      </header>
    );
  }

  const config = ROLE_CONFIG[role];
  const user = getCurrentDemoUser();
  const isNavItemActive = (path: string) =>
    location.pathname === path ||
    (path === '/admin-ai-settings' && location.pathname.startsWith('/admin-prompts/')) ||
    (path === '/supplier-catalog' && (location.pathname.startsWith('/supplier-products/') || location.pathname === '/supplier-catalog/import')) ||
    (path === '/designer-projects' && /^\/designer-projects\//.test(location.pathname));
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="min-h-[72px] max-w-[1440px] mx-auto px-6 lg:px-12 flex flex-wrap items-center gap-x-8 gap-y-2 py-3">
        <button type="button" onClick={() => navigate(config.defaultPath)} aria-label={`${config.badge} dashboard`}>
          <Logo size={32} />
        </button>
        <nav className="flex order-3 lg:order-2 w-full lg:w-auto overflow-x-auto gap-1" aria-label={`${config.badge} navigation`}>
          {config.navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isNavItemActive(item.path) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${isNavItemActive(item.path) ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ml-auto order-2 lg:order-3 flex items-center gap-3">
          <span className="rounded-full bg-teal-50 text-teal-700 px-3 py-1 text-xs font-semibold">{config.badge}</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((open) => !open)}
              aria-expanded={accountMenuOpen}
              aria-label="Open account menu"
              className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center"
            >
              <UserRound size={18} />
              <ChevronDown size={12} className="absolute translate-x-4 translate-y-3 rounded-full bg-white text-slate-700" />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
                <div className="px-4 py-2"><p className="text-sm font-semibold text-slate-800">{user?.name ?? config.badge}</p><p className="text-xs text-slate-400">{config.badge}</p></div>
                <button type="button" onClick={() => { setAccountMenuOpen(false); navigate('/settings'); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Profile &amp; Settings</button>
                {role === 'supplier' && <button type="button" onClick={() => { setAccountMenuOpen(false); navigate('/supplier-application'); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Application status</button>}
                {role === 'designer' && <button type="button" onClick={() => { setAccountMenuOpen(false); navigate('/designer-portfolio'); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">My Portfolio</button>}
                <button type="button" onClick={() => { setAccountMenuOpen(false); logoutDemo(); navigate('/'); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
