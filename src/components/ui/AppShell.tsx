import type { ReactNode } from 'react';
import { Header } from '@/components/layout';

/** App page frame: the shared Header plus a light-grey work area (no marketing footer). */
export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas font-sans text-slate-900">
      <Header />
      <main className={`mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 ${wide ? 'max-w-[1440px]' : 'max-w-[1240px]'}`}>{children}</main>
    </div>
  );
}
