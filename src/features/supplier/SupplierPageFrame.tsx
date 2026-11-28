import React from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export const SupplierPageFrame: React.FC<React.PropsWithChildren<{title:string;description:string;action?:React.ReactNode}>> = ({title,description,action,children}) => (
  <div className="flex min-h-screen flex-col overflow-x-clip bg-sand-50/70 font-sans"><Header role="supplier"/><main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-9 lg:px-12"><div className="mb-6 flex min-w-0 flex-col justify-between gap-4 sm:mb-7 md:flex-row md:items-end"><div className="min-w-0"><h1 className="break-words text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>{children}</main><Footer/></div>
);

export const SupplierCard: React.FC<React.PropsWithChildren<{title?:string;className?:string}>> = ({title,className='',children}) => <section className={`rounded-2xl border border-line bg-surface p-5 shadow-sm ${className}`}>{title&&<h2 className="mb-4 text-base font-bold text-ink">{title}</h2>}{children}</section>;
export const SupplierButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}> = ({secondary,className='',...props}) => <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary?'border border-line bg-surface text-slate-700 hover:bg-sand-50':'bg-brand text-white hover:bg-brand-hover'} ${className}`}/>;
export const SupplierBadge: React.FC<React.PropsWithChildren<{tone?:'blue'|'green'|'amber'|'red'|'gray'}>> = ({tone='gray',children}) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${{blue:'bg-sand-100 text-ink',green:'bg-emerald-50 text-emerald-700',amber:'bg-amber-50 text-amber-700',red:'bg-rose-50 text-rose-700',gray:'bg-slate-100 text-slate-600'}[tone]}`}>{children}</span>;
