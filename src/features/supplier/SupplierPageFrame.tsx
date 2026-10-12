import React from 'react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export const SupplierPageFrame: React.FC<React.PropsWithChildren<{title:string;description:string;action?:React.ReactNode}>> = ({title,description,action,children}) => (
  <div className="min-h-screen bg-slate-50/70 font-sans flex flex-col"><Header role="supplier"/><main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-9 lg:px-12"><div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div>{action}</div>{children}</main><Footer/></div>
);

export const SupplierCard: React.FC<React.PropsWithChildren<{title?:string;className?:string}>> = ({title,className='',children}) => <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{title&&<h2 className="mb-4 text-base font-bold text-slate-900">{title}</h2>}{children}</section>;
export const SupplierButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>&{secondary?:boolean}> = ({secondary,className='',...props}) => <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary?'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50':'bg-blue-600 text-white hover:bg-blue-700'} ${className}`}/>;
export const SupplierBadge: React.FC<React.PropsWithChildren<{tone?:'blue'|'green'|'amber'|'red'|'gray'}>> = ({tone='gray',children}) => <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${{blue:'bg-blue-50 text-blue-700',green:'bg-emerald-50 text-emerald-700',amber:'bg-amber-50 text-amber-700',red:'bg-rose-50 text-rose-700',gray:'bg-slate-100 text-slate-600'}[tone]}`}>{children}</span>;
