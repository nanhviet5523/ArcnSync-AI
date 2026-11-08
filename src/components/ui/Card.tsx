import type { ReactNode } from 'react';

export function Card({ title, description, actions, children, className = '', bodyClassName = 'p-5' }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`rounded-card border border-line bg-surface shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Icon square colours for StatCard. */
const ICON_TONE = {
  blue: 'bg-blue-50 text-blue-600',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
} as const;

export function StatCard({ label, value, hint, loading, icon, iconTone = 'blue', valueClassName = 'text-slate-900' }: {
  label: string; value: ReactNode; hint?: string; loading?: boolean;
  /** Optional icon shown in a light square on the left. */
  icon?: ReactNode; iconTone?: keyof typeof ICON_TONE; valueClassName?: string;
}) {
  const body = (
    <div className="min-w-0">
      <p className="text-[13px] text-slate-500">{label}</p>
      {loading ? <div className="mt-1.5 h-7 w-12 animate-pulse rounded bg-slate-100" /> : <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClassName}`}>{value}</p>}
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
      {icon ? (
        <div className="flex items-center gap-3.5">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[iconTone]}`}>{icon}</span>
          {body}
        </div>
      ) : body}
    </div>
  );
}

/** Definition list: label on the left, value on the right; stacks on narrow screens. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[140px_1fr]">
      {items.map((i) => (
        <div key={i.label} className="contents">
          <dt className="text-slate-500">{i.label}</dt>
          <dd className="min-w-0 break-words text-slate-900">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
