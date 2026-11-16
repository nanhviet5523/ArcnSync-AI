import { Fragment } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronDown, Hand, House, Lightbulb, MapPin, Maximize, Minus, MoreHorizontal, Plus, Rotate3d } from 'lucide-react';
import { StatusChip } from '@/components/ui';
import { t } from '@/i18n';
import { Dropdown, menuItem } from './WorkspaceBar';
import type { NavMode } from './Scene3D';

function Segment<T extends string>({ label, value, onChange, items, accent }: { label: string; value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; title?: string }[]; /** The drag mode: the active choice has to stand out. */ accent?: boolean }) {
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
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex rounded-lg bg-slate-100 p-0.5">
      {items.map((it) => (
        <button key={it.id} type="button" role="radio" aria-checked={value === it.id} tabIndex={value === it.id ? 0 : -1} title={it.title} onClick={() => onChange(it.id)}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${value === it.id ? (accent ? 'bg-brand-soft text-brand ring-1 ring-inset ring-brand/40' : 'bg-surface text-slate-900 shadow-sm') : 'text-slate-600 hover:text-slate-900'}`}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

const Divider = () => <span aria-hidden className="h-5 w-px bg-line" />;
const toolBtn = 'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand';
const pressable = (on: boolean) => `inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${on ? 'bg-brand text-white hover:bg-brand-hover' : 'text-slate-700 hover:bg-slate-100'}`;

export interface CompareOption { id: string; label: string; status: string }

interface Props {
  mode: '2d' | '3d';
  /** null = 3D not available (Layout stage is 2D only). */
  onMode: ((m: '2d' | '3d') => void) | null;
  nav: NavMode;
  onNav: (n: NavMode) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  /** Compare switch and version picker (2D only); null hides them. options: newest first. */
  compare: { on: boolean; toggle: () => void; selected: CompareOption; options: CompareOption[]; onPick: (id: string) => void } | null;
  /** Comment mode (shortcut C): clicks on the drawing open a comment box. null = viewer can't comment. */
  comment: { on: boolean; toggle: () => void } | null;
}

/** Floating toolbar at the bottom of the canvas. */
export function CanvasToolbar({ mode, onMode, nav, onNav, onZoomIn, onZoomOut, onFit, compare, comment }: Props) {
  const groups: ReactNode[] = [
    onMode && <Segment key="mode" label={t('workspace.viewMode')} value={mode} onChange={onMode} items={[{ id: '2d', label: '2D' }, { id: '3d', label: '3D' }]} />,
    // 2D drags always pan, so it has that one mode; 3D adds Orbit
    <Segment<NavMode> key="nav" accent label={t('ws.navigate')} value={mode === '3d' ? nav : 'pan'} onChange={mode === '3d' ? onNav : () => undefined} items={[
      { id: 'pan', label: <><Hand aria-hidden className="h-3.5 w-3.5" />{t('ws.pan')}</>, title: t(mode === '3d' ? 'ws.panHint' : 'ws.panHint2d') },
      ...(mode === '3d' ? [{ id: 'orbit' as const, label: <><Rotate3d aria-hidden className="h-3.5 w-3.5" />{t('ws.orbit')}</>, title: t('ws.orbitHint') }] : []),
    ]} />,
    comment && (
      <button key="comment" type="button" aria-pressed={comment.on} onClick={comment.toggle} aria-keyshortcuts="c" title={t('ws.commentModeHint')} className={pressable(comment.on)}>
        <MapPin aria-hidden className="h-3.5 w-3.5" />{t('ws.commentMode')}
        <kbd className={`rounded border px-1 font-sans text-[11px] leading-4 ${comment.on ? 'border-white/40 text-white' : 'border-line text-slate-500'}`}>C</kbd>
      </button>
    ),
    <div key="zoom" className="flex items-center gap-0.5">
      <button type="button" onClick={onZoomOut} aria-label={t('ws.zoomOut')} title={t('ws.zoomOutHint')} aria-keyshortcuts="-" className={toolBtn}><Minus aria-hidden className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onZoomIn} aria-label={t('ws.zoomIn')} title={t('ws.zoomInHint')} aria-keyshortcuts="+" className={toolBtn}><Plus aria-hidden className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onFit} title={t('ws.fitHint')} aria-keyshortcuts="0" className={toolBtn}><Maximize aria-hidden className="h-3.5 w-3.5" />{t('ws.fit')}</button>
    </div>,
  ].filter(Boolean);
  return (
    <div className="pointer-events-auto flex max-w-[calc(100%-24px)] flex-wrap items-center gap-2 rounded-card border border-line bg-surface px-2 py-1.5 shadow-float">
      {groups.map((g, i) => <Fragment key={i}>{i > 0 && <Divider />}{g}</Fragment>)}
      {compare && (
        <>
          <Divider />
          <div className="flex items-center gap-1.5 pl-1">
            <label className="flex min-h-6 cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" role="switch" checked={compare.on} onChange={compare.toggle} className="peer sr-only" aria-label={t('ws.compareWith', { label: compare.selected.label })} />
              <span aria-hidden className="relative h-4 w-7 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand after:absolute after:left-0.5 after:top-0.5 after:h-3 after:w-3 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-3" />
              {t('ws.compareWithLabel')}
            </label>
            <Dropdown label={t('ws.compareVersion')} up align="right"
              className="inline-flex h-7 items-center gap-1 rounded-md border border-line px-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
              button={<>{compare.selected.label}<ChevronDown aria-hidden className="h-3.5 w-3.5 text-slate-500" /></>}>
              {(close) => compare.options.map((o) => (
                <button key={o.id} type="button" role="menuitem" aria-current={o.id === compare.selected.id || undefined} className={menuItem} onClick={() => { compare.onPick(o.id); close(); }}>
                  <span className={`min-w-0 flex-1 truncate ${o.id === compare.selected.id ? 'font-semibold text-brand' : 'font-medium'}`}>{o.label}</span>
                  <StatusChip kind="version" value={o.status} size="sm" />
                </button>
              ))}
            </Dropdown>
          </div>
        </>
      )}
    </div>
  );
}

/** Lights and Ceiling switches at the canvas' top-right corner (3D only, not saved with the version). */
export function SceneToggles({ lights, ceiling, onLights, onCeiling }: { lights: boolean; ceiling: boolean; onLights: () => void; onCeiling: () => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-float">
      <button type="button" aria-pressed={lights} onClick={onLights} title={t('ws.lightsHint')} className={pressable(lights)}><Lightbulb aria-hidden className="h-3.5 w-3.5" />{t('ws.lights')}</button>
      <button type="button" aria-pressed={ceiling} onClick={onCeiling} title={t('ws.ceilingHint')} className={pressable(ceiling)}><House aria-hidden className="h-3.5 w-3.5" />{t('ws.ceiling')}</button>
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
