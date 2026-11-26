import type { ReactNode } from 'react';
import { Footer, Header } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';

/**
 * App page frame: the shared Header plus a light-grey work area.
 * Footer: shown for homeowners by default (other roles keep the bare work area); `footer={false}` hides it on pages
 * that fill the window height, like /messages.
 */
export function AppShell({ children, wide, footer }: { children: ReactNode; wide?: boolean; footer?: boolean }) {
  const showFooter = footer ?? getCurrentUser()?.role === 'homeowner';
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-slate-900">
      <Header />
      <main className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${wide ? 'max-w-[1440px]' : 'max-w-[1240px]'}`}>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
