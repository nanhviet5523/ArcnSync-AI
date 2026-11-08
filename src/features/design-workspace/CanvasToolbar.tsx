import type { ReactNode } from 'react';
import { Hand, MapPin, Maximize, MoreHorizontal, Rotate3d } from 'lucide-react';
import { t } from '@/i18n';
import { Dropdown, menuItem } from './WorkspaceBar';
import type { NavMode } from './Scene3D';

function Segment<T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; title?: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-slate-100 p-0.5">
      {items.map((it) => (
        <button key={it.id} type="button" role="radio" aria-checked={value === it.id} title={it.title} onClick={() => onChange(it.id)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${value === it.id ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

const Divider = () => <span aria-hidden className="h-5 w-px bg-line" />;

interface Props {
  mode: '2d' | '3d';
  /** null = 3D not available (Layout stage is 2D only). */
  onMode: ((m: '2d' | '3d') => void) | null;
  nav: NavMode;
  onNav: (n: NavMode) => void;
  onReset: () => void;
  /** Compare toggle (2D only); null hides it. */
  compare: { label: string; on: boolean; toggle: () => void } | null;
  /** Comment mode (shortcut C): clicks on the drawing open a comment box. null = viewer can't comment. */
  comment: { on: boolean; toggle: () => void } | null;
}

/** Floating toolbar at the bottom of the canvas. */
export function CanvasToolbar({ mode, onMode, nav, onNav, onReset, compare, comment }: Props) {
  return (
    <div className="pointer-events-auto flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-2 py-1.5 shadow-float">
      {onMode && (
        <Segment label={t('workspace.viewMode')} value={mode} onChange={onMode} items={[{ id: '2d', label: '2D' }, { id: '3d', label: '3D' }]} />
      )}
      {mode === '3d' && (
        <>
          {onMode && <Divider />}
          <Segment label={t('ws.navigate')} value={nav} onChange={onNav} items={[
            { id: 'orbit', label: <><Rotate3d aria-hidden className="h-3.5 w-3.5" />{t('ws.orbit')}</>, title: t('ws.orbitHint') },
            { id: 'pan', label: <><Hand aria-hidden className="h-3.5 w-3.5" />{t('ws.pan')}</>, title: t('ws.panHint') },
          ]} />
        </>
      )}
      {comment && (
        <>
          {(onMode || mode === '3d') && <Divider />}
          <button type="button" aria-pressed={comment.on} onClick={comment.toggle} aria-keyshortcuts="c" title={t('ws.commentModeHint')}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${comment.on ? 'bg-brand text-white hover:bg-brand-hover' : 'text-slate-700 hover:bg-slate-100'}`}>
            <MapPin aria-hidden className="h-3.5 w-3.5" />{t('ws.commentMode')}
            <kbd className={`rounded border px-1 font-sans text-[11px] leading-4 ${comment.on ? 'border-white/40 text-white' : 'border-line text-slate-500'}`}>C</kbd>
          </button>
        </>
      )}
      <Divider />
      <button type="button" onClick={onReset} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand">
        <Maximize aria-hidden className="h-3.5 w-3.5" />{t('scene.resetView')}
      </button>
      {compare && (
        <>
          <Divider />
          <label className="flex cursor-pointer items-center gap-2 px-1 text-xs font-semibold text-slate-700">
            <input type="checkbox" role="switch" checked={compare.on} onChange={compare.toggle} className="peer sr-only" />
            <span aria-hidden className="relative h-4 w-7 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
            {compare.label}
          </label>
        </>
      )}
    </div>
  );
}

/** "⋯" menu at the canvas' top-right corner. */
export function CanvasMenu({ items }: { items: { label: string; icon: ReactNode; run: () => void }[] }) {
  if (!items.length) return null;
  return (
    <Dropdown label={t('ws.moreActions')} align="right"
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-slate-700 shadow-float hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
      button={<MoreHorizontal className="h-4 w-4" />}>
      {(close) => items.map((it) => (
        <button key={it.label} type="button" role="menuitem" className={menuItem} onClick={() => { it.run(); close(); }}>
          {it.icon}{it.label}
        </button>
      ))}
    </Dropdown>
  );
}
