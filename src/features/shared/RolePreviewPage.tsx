import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { ROLE_CONFIG } from '@/types/role';
import type { UserRole } from '@/types/role';

interface RolePreviewPageProps {
  role: UserRole;
}

export const RolePreviewPage: React.FC<RolePreviewPageProps> = ({ role }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const config = ROLE_CONFIG[role];
  const activeItem = config.navItems.find((item) => item.path === location.pathname);
  const title = activeItem?.label ?? config.badge;

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col">
      <Header role={role} />
      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-600">{config.badge} workspace</p>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">{title}</h1>
        </div>
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 lg:p-12">
          <h2 className="text-xl font-bold text-slate-900">Demo role preview</h2>
          <p className="max-w-2xl text-slate-600 mt-3 leading-7">
            You are signed in as the demo {config.badge} account. This project does not have this role's full page UI yet; this preview lets you check the role-specific header and shared pages.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <button onClick={() => navigate('/messages')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
              Open shared Messages <ArrowRight size={16} />
            </button>
            <button onClick={() => navigate('/settings')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Profile &amp; Settings
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default RolePreviewPage;
