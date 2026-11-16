import type { ReactNode } from 'react';
import { t } from '@/i18n';
import { Button } from './Button';
import { statusInfo, TONE_CLASS } from './status';
import type { StatusKind, Tone } from './status';

export function StatusChip({ kind, value, tone, label, size = 'md' }: { kind?: StatusKind; value?: string; tone?: Tone; label?: string; size?: 'sm' | 'md' }) {
  const info = kind && value ? statusInfo(kind, value) : { label: label ?? '', tone: tone ?? 'gray' };
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-bold ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-xs'} ${TONE_CLASS[tone ?? info.tone]}`}>
      {label ?? info.label}
    </span>
  );
}

export function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;
}

export function EmptyState({ title, action, compact }: { title: string; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 text-center ${compact ? 'px-4 py-6' : 'px-6 py-12'}`}>
      <p className="max-w-sm text-sm text-slate-600">{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span>{message}</span>
      {onRetry && <Button size="sm" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  );
}

export function Banner({ tone = 'blue', children, action }: { tone?: 'blue' | 'amber' | 'slate'; children: ReactNode; action?: ReactNode }) {
  const cls = { blue: 'border-blue-100 bg-brand-soft text-blue-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', slate: 'border-slate-700 bg-slate-800 text-white' }[tone];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}
