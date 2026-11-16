import type { KeyboardEvent, ReactNode } from 'react';

export interface TabItem<T extends string> { id: T; label: ReactNode; badge?: number }

/** Segmented tabs. Arrow keys move between tabs. */
export function Tabs<T extends string>({ items, value, onChange, label, size = 'md', className = '' }: {
  items: TabItem<T>[]; value: T; onChange: (id: T) => void; label: string; size?: 'sm' | 'md'; className?: string;
}) {
  const onKey = (e: KeyboardEvent) => {
    const i = items.findIndex((x) => x.id === value);
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step) { e.preventDefault(); onChange(items[(i + step + items.length) % items.length].id); }
  };
  return (
    <div role="tablist" aria-label={label} onKeyDown={onKey} className={`inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 ${className}`}>
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button key={it.id} role="tab" type="button" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange(it.id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} ${on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {it.label}
            {!!it.badge && <span className="min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[11px] font-semibold leading-[18px] text-white">{it.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
