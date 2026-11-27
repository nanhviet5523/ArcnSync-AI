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
  blue: 'bg-sand-100 text-ink',
  orange: 'bg-orange-50 text-orange-600',
  violet: 'bg-violet-50 text-violet-600',
  green: 'bg-emerald-50 text-emerald-600',
  slate: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-700',
  brand: 'bg-brand-soft text-brand',
} as const;

/**
 * Number tile. With `onClick` it becomes a toggle (a quick filter): lifts on hover, ringed while `active`.
 * `attention` tints it amber with a soft pulsing dot, for a count that needs someone to act.
 */
export function StatCard({ label, value, hint, loading, icon, iconTone = 'blue', valueClassName = 'text-slate-900', onClick, active, attention, title }: {
  label: string; value: ReactNode; hint?: string; loading?: boolean;
  /** Optional icon shown in a light square on the left. */
  icon?: ReactNode; iconTone?: keyof typeof ICON_TONE; valueClassName?: string;
  onClick?: () => void; active?: boolean; attention?: boolean; title?: string;
}) {
  const body = (
    <div className="min-w-0">
      <p className="text-[13px] text-slate-500">{label}</p>
      {loading ? <div className="mt-1.5 h-7 w-12 animate-pulse rounded bg-slate-100" /> : <p className={`mt-1 text-2xl font-bold tabular-nums ${valueClassName}`}>{value}</p>}
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  const content = (
    <>
      {attention && (
        <span aria-hidden className="absolute right-3.5 top-3.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      )}
      {icon ? (
        <div className="flex items-center gap-3.5">
          <span aria-hidden className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ICON_TONE[iconTone]}`}>{icon}</span>
          {body}
        </div>
      ) : body}
    </>
  );
  const frame = `relative rounded-card border px-4 py-3.5 text-left shadow-card ${
    attention ? 'border-amber-200 bg-linear-to-br from-amber-50 to-surface' : 'border-line bg-surface'
  } ${active ? 'ring-2 ring-brand ring-offset-2 ring-offset-canvas' : ''}`;
  if (!onClick) return <div className={frame}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={!!active}
      title={title}
      className={`${frame} w-full cursor-pointer transition duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0`}
    >
      {content}
    </button>
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
