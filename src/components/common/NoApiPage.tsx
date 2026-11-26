import React from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';

interface NoApiPageProps {
  role?: UserRole;
  title: string;
}

export const NoApiPage: React.FC<NoApiPageProps> = ({ role, title }) => {
  const currentRole = role ?? getCurrentUser()?.role ?? 'homeowner';

  return (
    <div className="flex min-h-screen flex-col bg-sand-50/70 font-sans">
      <Header role={currentRole} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 items-center justify-center px-6 py-12 lg:px-12">
        <section className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <h1 className="mt-3 text-2xl font-bold text-ink">Trống - chưa có API</h1>
        </section>
      </main>
      <Footer />
    </div>
  );
};
