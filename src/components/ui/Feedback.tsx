import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Ban, CheckCircle2, Info, Undo2, X, XCircle } from 'lucide-react';
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

export function ErrorState({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <span>{message}</span>
      {(onRetry || onDismiss) && (
        <span className="flex gap-2">
          {onRetry && <Button size="sm" onClick={onRetry}>{t('common.retry')}</Button>}
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>{t('common.close')}</Button>}
        </span>
      )}
    </div>
  );
}

export function Banner({ tone = 'blue', children, action }: { tone?: 'blue' | 'amber' | 'rose' | 'slate'; children: ReactNode; action?: ReactNode }) {
  const cls = { blue: 'border-blue-100 bg-brand-soft text-dark', amber: 'border-amber-200 bg-amber-50 text-amber-900', rose: 'border-rose-200 bg-rose-50 text-rose-900', slate: 'border-slate-700 bg-slate-800 text-white' }[tone];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <div className="min-w-0">{children}</div>
      {action}
    </div>
  );
}

/** `cancelled` and `returned` report an action that worked but stopped or sent something back: not a ✓, not an error. */
export type NoticeTone = 'success' | 'error' | 'warning' | 'info' | 'cancelled' | 'returned';
const NOTICE: Record<NoticeTone, { tone: string; icon: LucideIcon }> = {
  success: { tone: 'ok', icon: CheckCircle2 },
  error: { tone: 'bad', icon: XCircle },
  warning: { tone: 'warn', icon: AlertTriangle },
  info: { tone: 'info', icon: Info },
  cancelled: { tone: 'bad', icon: Ban },
  returned: { tone: 'warn', icon: Undo2 },
};

/**
 * A static notice that stays where it is (no timer, no movement): the result of an action shown inside the card it
 * belongs to, e.g. "Survey cancelled." In the toasts' palette colours (--tone-* in globals.css): soft fill, a bar
 * in the tone colour on the left, a filled icon. Fades in once; `onClose` adds a × for the reader to put it away.
 */
export function Notice({ tone = 'info', title, children, onClose, className = '' }: {
  tone?: NoticeTone; title?: ReactNode; children: ReactNode; onClose?: () => void; className?: string;
}) {
  const { tone: name, icon: Icon } = NOTICE[tone];
  const vars = { '--tone': `var(--tone-${name})`, '--tone-soft': `var(--tone-${name}-soft)`, '--tone-line': `var(--tone-${name}-line)` } as CSSProperties;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} style={vars}
      className={`notice-in relative flex items-start gap-3 overflow-hidden rounded-xl border border-[var(--tone-line)] bg-[var(--tone-soft)] py-3 pl-4 pr-3 shadow-card ${className}`}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[var(--tone)]" />
      <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--tone)] text-white shadow-[0_2px_6px_-2px_rgb(43_36_24/0.35)]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.3} />
      </span>
      <div className="min-w-0 flex-1 self-center text-sm leading-snug">
        {title && <p className="font-semibold text-ink">{title}</p>}
        <div className={title ? 'mt-0.5 text-ink-2' : 'font-medium text-ink'}>{children}</div>
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label={t('common.close')}
          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-subtext-2 transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-[var(--tone)]">
          <X aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
