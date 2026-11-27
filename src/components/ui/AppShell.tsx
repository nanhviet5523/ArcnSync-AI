import type { ReactNode } from 'react';
import { Footer, Header } from '@/components/layout';
import { getCurrentUser } from '@/services/authService';

/** Shared app frame. `wide` remains accepted for existing callers; all app pages now share the same content rails. */
export function AppShell({ children, wide, footer }: {
  children: ReactNode;
  wide?: boolean;
  footer?: boolean;
}) {
  const showFooter = footer ?? true;

  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-slate-900">
      <Header />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6 lg:px-12 lg:py-8">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}