import type { KeyboardEvent, ReactNode } from 'react';
import { base } from './wsClasses';

export const Divider = () => <span aria-hidden className="h-5 w-px shrink-0 bg-line" />;

/** Count of open items (comments) on a tab, floor or room. Brown: red is kept for errors. */
export function CountBadge({ n, className = '' }: { n?: number; className?: string }) {
  if (!n) return null;
  return <span className={`min-w-[18px] rounded-full bg-ink px-1 text-center text-[11px] font-semibold leading-[18px] tabular-nums text-surface ${className}`}>{n}</span>;
}

/** Small status dot: olive = live / current. */
export const StatusDot = ({ on = true }: { on?: boolean }) => (
  <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${on ? 'bg-brand' : 'bg-line-strong'}`} />
);

/** Switch on a visually hidden checkbox, so labels and keyboard work as for any checkbox. */
export function Switch({ checked, onChange, label, children, size = 'md', className = '' }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; children?: ReactNode; size?: 'sm' | 'md'; className?: string;
}) {
  const track = size === 'sm'
    ? 'h-4 w-7 after:h-3 after:w-3 peer-checked:after:translate-x-3'
    : 'h-5 w-9 after:h-4 after:w-4 peer-checked:after:translate-x-4';
  return (
    <label className={`flex min-h-6 cursor-pointer items-center gap-2 ${className}`}>
      {children}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer sr-only" />
      <span aria-hidden className={`relative shrink-0 rounded-full bg-line-strong transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform ${track}`} />
    </label>
  );
}

/** Radio group of tool buttons (2D | 3D, Pan | Orbit). accent: the drag mode, its active choice is olive. */
export function Segment<T extends string>({ label, value, onChange, items, accent }: {
  label: string; value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; title?: string }[]; accent?: boolean;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = items.findIndex((x) => x.id === value);
    const next = (i + step + items.length) % items.length;
    onChange(items[next].id);
    (e.currentTarget.children[next] as HTMLElement).focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {items.map((it) => {
        const on = value === it.id;
        return (
          <button key={it.id} type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} title={it.title} onClick={() => onChange(it.id)}
            className={`${base} h-6 px-2.5 ${on ? (accent ? 'bg-brand text-surface' : 'bg-surface text-ink shadow-[inset_0_0_0_1px_var(--color-line-strong)]') : 'text-ink-2 hover:bg-surface/60 hover:text-ink'}`}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
