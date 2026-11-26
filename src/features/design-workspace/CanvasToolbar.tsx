import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { ChevronDown, Hand, House, Layers, Lightbulb, MapPin, Maximize, Minus, MoreHorizontal, Plus, Rotate3d, Scan } from 'lucide-react';
import { StatusChip } from '@/components/ui';
import { t } from '@/i18n';
import { Dropdown, menuItem } from './WorkspaceBar';
import { Divider, Segment, Switch } from './wsUi';
import { floatBar, floatIconBtn, outlineBtn, toggleBtn, toolBtn } from './wsClasses';
import type { NavMode } from './Scene3D';

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
  /** Whole-house switch and cut level (3D, more than one floor); null hides them. cut: highest level drawn, null = all. */
  house?: { on: boolean; toggle: () => void; cut: number | null; onCut: (level: number | null) => void; levels: { level: number; name: string }[] } | null;
  /** View all (3D): clears the room and frames everything. */
  onViewAll?: (() => void) | null;
}

/** Floating toolbar at the bottom of the canvas. */
export function CanvasToolbar({ mode, onMode, nav, onNav, onZoomIn, onZoomOut, onFit, compare, comment, house, onViewAll }: Props) {
  // the top floor is never offered: cutting above it draws everything
  const cuts = house ? house.levels.slice(0, -1) : [];
  const cutName = house?.cut == null ? t('scene.allFloors') : house.levels.find((l) => l.level === house.cut)?.name ?? t('scene.allFloors');
  const groups: ReactNode[] = [
    onMode && <Segment key="mode" label={t('workspace.viewMode')} value={mode} onChange={onMode} items={[{ id: '2d', label: '2D' }, { id: '3d', label: '3D' }]} />,
    // 2D drags always pan, so it has that one mode; 3D adds Orbit
    <Segment<NavMode> key="nav" accent label={t('ws.navigate')} value={mode === '3d' ? nav : 'pan'} onChange={mode === '3d' ? onNav : () => undefined} items={[
      { id: 'pan', label: <><Hand aria-hidden className="h-3.5 w-3.5" />{t('ws.pan')}</>, title: t(mode === '3d' ? 'ws.panHint' : 'ws.panHint2d') },
      ...(mode === '3d' ? [{ id: 'orbit' as const, label: <><Rotate3d aria-hidden className="h-3.5 w-3.5" />{t('ws.orbit')}</>, title: t('ws.orbitHint') }] : []),
    ]} />,
    comment && (
      <button key="comment" type="button" aria-pressed={comment.on} onClick={comment.toggle} aria-keyshortcuts="c" title={t('ws.commentModeHint')} className={toggleBtn(comment.on)}>
        <MapPin aria-hidden className="h-3.5 w-3.5" />{t('ws.commentMode')}
        <kbd className={`rounded border px-1 font-sans text-[11px] leading-4 ${comment.on ? 'border-surface/40 text-surface' : 'border-line text-subtext'}`}>C</kbd>
      </button>
    ),
    (house || onViewAll) && (
      <div key="house" className="flex items-center gap-0.5">
        {house && (
          <button type="button" aria-pressed={house.on} onClick={house.toggle} title={t('scene.wholeHouseHint')} className={toggleBtn(house.on)}>
            <Layers aria-hidden className="h-3.5 w-3.5" />{t('scene.wholeHouse')}
          </button>
        )}
        {house?.on && cuts.length > 0 && (
          <Dropdown label={t('scene.cutAbove')} up align="right" className={`${outlineBtn} ml-1`} menuWidth="min-w-[180px]"
            button={<><span className="hidden font-medium text-subtext xl:inline">{t('scene.cutAbove')}:</span>{cutName}<ChevronDown aria-hidden className="h-3.5 w-3.5 text-subtext" /></>}>
            {(close) => [{ level: null, name: t('scene.allFloors') }, ...cuts].map((l) => (
              <button key={l.level ?? 'all'} type="button" role="menuitemradio" aria-checked={house.cut === l.level} className={menuItem} onClick={() => { house.onCut(l.level); close(); }}>
                <span className={`min-w-0 flex-1 truncate ${house.cut === l.level ? 'font-semibold text-brand' : 'font-medium'}`}>{l.name}</span>
              </button>
            ))}
          </Dropdown>
        )}
        {onViewAll && (
          <button type="button" onClick={onViewAll} aria-label={t('scene.viewAll')} title={t('scene.viewAllHint')} className={toolBtn}><Scan aria-hidden className="h-3.5 w-3.5" /><span className="hidden xl:inline">{t('scene.viewAll')}</span></button>
        )}
      </div>
    ),
    <div key="zoom" className="flex items-center gap-0.5">
      <button type="button" onClick={onZoomOut} aria-label={t('ws.zoomOut')} title={t('ws.zoomOutHint')} aria-keyshortcuts="-" className={toolBtn}><Minus aria-hidden className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onZoomIn} aria-label={t('ws.zoomIn')} title={t('ws.zoomInHint')} aria-keyshortcuts="+" className={toolBtn}><Plus aria-hidden className="h-3.5 w-3.5" /></button>
      <button type="button" onClick={onFit} aria-label={t('ws.fit')} title={t('ws.fitHint')} aria-keyshortcuts="0" className={toolBtn}><Maximize aria-hidden className="h-3.5 w-3.5" /><span className="hidden xl:inline">{t('ws.fit')}</span></button>
    </div>,
    compare && (
      <div key="compare" className="flex items-center gap-1.5 pl-0.5">
        <Switch size="sm" checked={compare.on} onChange={compare.toggle} label={t('ws.compareWith', { label: compare.selected.label })} className="flex-row-reverse text-xs font-semibold text-ink-2">
          {t('ws.compareWithLabel')}
        </Switch>
        <Dropdown label={t('ws.compareVersion')} up align="right" className={outlineBtn}
          button={<>{compare.selected.label}<ChevronDown aria-hidden className="h-3.5 w-3.5 text-subtext" /></>}>
          {(close) => compare.options.map((o) => (
            <button key={o.id} type="button" role="menuitem" aria-current={o.id === compare.selected.id || undefined} className={menuItem} onClick={() => { compare.onPick(o.id); close(); }}>
              <span className={`min-w-0 flex-1 truncate ${o.id === compare.selected.id ? 'font-semibold text-brand' : 'font-medium'}`}>{o.label}</span>
              <StatusChip kind="version" value={o.status} size="sm" />
            </button>
          ))}
        </Dropdown>
      </div>
    ),
  ].filter(Boolean);
  return (
    <div className={`pointer-events-auto flex max-w-[calc(100%-24px)] flex-wrap items-center gap-1.5 px-1.5 py-1 ${floatBar}`}>
      {groups.map((g, i) => <Fragment key={i}>{i > 0 && <Divider />}{g}</Fragment>)}
    </div>
  );
}

/** Lights and Ceiling switches at the canvas' top-right corner (3D only, not saved with the version). */
export function SceneToggles({ lights, ceiling, onLights, onCeiling, ceilingOff }: { lights: boolean; ceiling: boolean; onLights: () => void; onCeiling: () => void; /** Whole house: the ceiling view works one floor at a time. */ ceilingOff?: boolean }) {
  return (
    <div className={`flex items-center gap-0.5 p-0.5 ${floatBar}`}>
      <button type="button" aria-pressed={lights} onClick={onLights} title={t('ws.lightsHint')} className={toggleBtn(lights)}><Lightbulb aria-hidden className="h-3.5 w-3.5" />{t('ws.lights')}</button>
      <button type="button" aria-pressed={ceiling && !ceilingOff} aria-disabled={ceilingOff || undefined} onClick={ceilingOff ? undefined : onCeiling} title={t(ceilingOff ? 'scene.ceilingOffInHouse' : 'ws.ceilingHint')} className={toggleBtn(ceiling && !ceilingOff)}><House aria-hidden className="h-3.5 w-3.5" />{t('ws.ceiling')}</button>
    </div>
  );
}

/** "⋯" menu at the canvas' top-right corner. */
export function CanvasMenu({ items }: { items: { label: string; icon: ReactNode; run: () => void }[] }) {
  if (!items.length) return null;
  return (
    <Dropdown label={t('ws.moreActions')} align="right" className={floatIconBtn} button={<MoreHorizontal className="h-4 w-4" />}>
      {(close) => items.map((it) => (
        <button key={it.label} type="button" role="menuitem" className={menuItem} onClick={() => { it.run(); close(); }}>
          {it.icon}{it.label}
        </button>
      ))}
    </Dropdown>
  );
}
