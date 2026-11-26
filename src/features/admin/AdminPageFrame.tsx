import React from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

interface AdminPageFrameProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const AdminPageFrame: React.FC<AdminPageFrameProps> = ({ title, description, action, children }) => (
  <div className="min-h-screen bg-sand-50/70 font-sans flex flex-col">
    <Header role="admin" />
    <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-9 flex-1">
      <div className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </main>
    <Footer />
  </div>
);

export const AdminCard: React.FC<React.PropsWithChildren<{ title?: string; className?: string }>> = ({ title, className = '', children }) => (
  <section className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>
    {title && <h2 className="mb-4 text-base font-bold text-ink">{title}</h2>}
    {children}
  </section>
);

export const AdminButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { secondary?: boolean }> = ({ secondary, className = '', ...props }) => (
  <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? 'border border-line bg-surface text-slate-700 hover:bg-sand-50' : 'bg-brand text-white hover:bg-brand-hover'} ${className}`} />
);

export const AdminTable: React.FC<React.PropsWithChildren<{ headings: string[] }>> = ({ headings, children }) => (
  <div className="overflow-x-auto rounded-xl border border-line">
    <table className="w-full min-w-[680px] text-left text-sm">
      <thead className="bg-sand-50 text-xs uppercase tracking-wide text-slate-500"><tr>{headings.map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

export const AdminCell: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = '' }) => <td className={`px-4 py-3.5 text-slate-700 ${className}`}>{children}</td>;
