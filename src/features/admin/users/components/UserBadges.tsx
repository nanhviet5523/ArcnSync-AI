import React from 'react';
import { roleBadgeClass } from '@/components/ui/status';

export const ROLE_BADGE: Record<string, string> = Object.fromEntries(['ADMIN', 'STAFF', 'DESIGNER', 'SUPPLIER', 'CUSTOMER'].map((role) => [role, roleBadgeClass(role)]));

export const STATUS_BADGE: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-600',
  LOCKED: 'bg-red-50 text-red-700',
  INVITED: 'bg-amber-50 text-amber-700',
};

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

export const Badge: React.FC<{ value: string; styles: Record<string, string> }> = ({ value, styles }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[value] ?? 'bg-slate-100 text-slate-600'}`}>
    {titleCase(value)}
  </span>
);
