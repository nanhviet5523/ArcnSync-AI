import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Logo } from '@/components/common/Logo';

interface AdminHeaderProps {
  activeTab?: 'dashboard' | 'users' | 'master-data' | 'ai-settings';
  onTabChange?: (tab: 'dashboard' | 'users' | 'master-data' | 'ai-settings') => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab =
    activeTab ||
    (location.pathname.includes('/admin/users') || location.pathname.includes('/admin/roles')
      ? 'users'
      : location.pathname.includes('/admin/master-data')
      ? 'master-data'
      : location.pathname.includes('/admin/ai-settings')
      ? 'ai-settings'
      : 'dashboard');

  const handleNavClick = (tab: 'dashboard' | 'users' | 'master-data' | 'ai-settings') => {
    if (onTabChange) {
      onTabChange(tab);
    }
    switch (tab) {
      case 'dashboard':
        navigate('/admin/overview');
        break;
      case 'users':
        navigate('/admin/users');
        break;
      case 'master-data':
        navigate('/admin/master-data');
        break;
      case 'ai-settings':
        navigate('/admin/ai-settings');
        break;
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Navigation Links */}
        <div className="flex items-center gap-10">
          <div
            className="cursor-pointer transition-opacity hover:opacity-90"
            onClick={() => handleNavClick('dashboard')}
          >
            <Logo size={32} />
          </div>

          <nav className="flex items-center gap-8 text-sm">
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`font-medium transition-colors cursor-pointer py-1 ${
                currentTab === 'dashboard'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('users')}
              className={`font-medium transition-colors cursor-pointer py-1 ${
                currentTab === 'users'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Users & Roles
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('master-data')}
              className={`font-medium transition-colors cursor-pointer py-1 ${
                currentTab === 'master-data'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Master Data
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('ai-settings')}
              className={`font-medium transition-colors cursor-pointer py-1 ${
                currentTab === 'ai-settings'
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              AI Settings
            </button>
          </nav>
        </div>

        {/* Right: Admin Pill Badge, Notification Bell & User Avatar AD */}
        <div className="flex items-center gap-3.5">
          <span className="px-3 py-1 bg-amber-100/90 text-amber-900 text-xs font-semibold rounded-full select-none">
            Admin
          </span>

          <button
            type="button"
            title="Notifications"
            className="relative w-8.5 h-8.5 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-slate-900 rounded-full" />
          </button>

          <div
            title="Admin Profile"
            onClick={() => navigate('/settings')}
            className="w-8.5 h-8.5 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center cursor-pointer hover:bg-slate-800 transition select-none shadow-xs"
          >
            AD
          </div>
        </div>
      </div>
    </header>
  );
};
