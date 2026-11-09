import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft, Download, MessageSquare, PanelLeft } from 'lucide-react';
import { UserMenus } from '@/components/layout';
import { StatusChip, Stepper, Z } from '@/components/ui';
import { t, tList } from '@/i18n';
import type { UserRole } from '@/types/role';
import { formatTime, versionLabel } from './logic';
import { conceptStep } from '@/features/projects/projectView';
import type { VersionSummary, VersionType } from './types';

/** Small dropdown: closes on outside click, Escape, or after an item runs. */
export function Dropdown({ label, button, align = 'left', up = false, className = '', title, menuWidth = 'min-w-[220px]', children }: {
  label: string; button: ReactNode; align?: 'left' | 'right'; /** Open above the button (for bars at the bottom of the screen). */ up?: boolean; className?: string; title?: string; menuWidth?: string; children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuItems = () => [...(menu.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button ref={trigger} type="button" aria-label={label} title={title} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className={className}>{button}</button>
      {open && (
        <div ref={menu} role="menu" onKeyDown={(e) => {
          const list = menuItems(), i = list.indexOf(document.activeElement as HTMLElement);
          const to = e.key === 'ArrowDown' ? (i + 1) % list.length : e.key === 'ArrowUp' ? (i - 1 + list.length) % list.length : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1;
          if (to >= 0 && list.length) { e.preventDefault(); list[to].focus(); }
        }} className={`absolute ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${Z.menu} ${menuWidth} rounded-card border border-line bg-surface py-1.5 shadow-float ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export const menuItem = 'flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none';

interface Props {
  role: UserRole;
  backTo: string;
  title: string;
  stage: VersionType | null;
  versions: VersionSummary[];
  current: VersionSummary | null;
  onVersion: (id: string) => void;
  /** Same-stage versions the current one can be compared with (2D). */
  canCompare: (v: VersionSummary) => boolean;
  onCompare: (id: string) => void;
  download: { label: string; run: () => void } | null;
  step: number;
  /** The one primary action for this role and stage. */
  primary?: ReactNode;
  /** Outline buttons before the primary one (e.g. Project info). */
  secondary?: ReactNode;
  /** Below 1024px the side columns are drawers. */
  onOpenLeft: () => void;
  onOpenRight: () => void;
  openComments: number;
}

export function WorkspaceBar({ role, backTo, title, stage, versions, current, onVersion, canCompare, onCompare, download, step, primary, secondary, onOpenLeft, onOpenRight, openComments }: Props) {
  const iconBtn = 'rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand';
  return (
    <header className="flex h-14 min-w-0 items-center gap-3 border-b border-line bg-surface px-3 lg:px-4">
      <Link to={backTo} aria-label={t('common.back')} title={t('common.back')} className={iconBtn}><ChevronLeft className="h-5 w-5" /></Link>
      <button type="button" onClick={onOpenLeft} aria-label={t('ws.rooms')} className={`${iconBtn} lg:hidden`}><PanelLeft className="h-5 w-5" /></button>

      <h1 className="min-w-0 max-w-[260px] truncate text-[15px] font-bold tracking-tight text-slate-900 2xl:max-w-[360px]" title={title}>{title}</h1>
      {stage && <span className="hidden sm:inline-flex"><StatusChip kind="stage" value={stage} /></span>}

      {current && (
        <Dropdown label={t('ws.versionMenu')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand"
          button={<>
            <span className="font-semibold">{versionLabel(current.label, role)}</span>
            <span className="hidden text-slate-500 md:inline">· {t(`status.version.${current.status}`)}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </>}>
          {(close) => (
            <div className="w-[320px]">
              <p className="px-3 pb-1 pt-0.5 text-[11px] font-medium text-slate-500">{t('workspace.versions')}</p>
              <ul className="max-h-[50vh] overflow-y-auto">
                {versions.map((v) => {
                  const on = v.id === current.id;
                  return (
                    <li key={v.id} className={`flex items-center gap-1 pr-2 ${on ? 'bg-brand-soft' : ''}`}>
                      <button type="button" role="menuitem" aria-current={on || undefined} onClick={() => { onVersion(v.id); close(); }}
                        className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-slate-50/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand">
                        <span className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold ${v.status === 'SUPERSEDED' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{versionLabel(v.label, role)}</span>
                          <StatusChip kind="version" value={v.status} size="sm" />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-600">{v.title}</span>
                        <span className="block text-[11px] tabular-nums text-slate-500">{t(`status.stage.${v.version_type}`)} · {formatTime(v.created_at)}</span>
                      </button>
                      {canCompare(v) && (
                        <button type="button" role="menuitem" onClick={() => { onCompare(v.id); close(); }} title={t('ws.compareWith', { label: versionLabel(v.label, role) })}
                          aria-label={t('ws.compareWith', { label: versionLabel(v.label, role) })}
                          className="shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-brand focus-visible:outline-2 focus-visible:outline-brand">
                          {t('compare.title')}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {download && (
                <div className="mt-1 border-t border-line pt-1">
                  <button type="button" role="menuitem" className={menuItem} onClick={() => { download.run(); close(); }}>
                    <Download className="h-4 w-4 text-slate-500" />{download.label}
                  </button>
                </div>
              )}
            </div>
          )}
        </Dropdown>
      )}

      <Stepper size="sm" steps={tList('steps.workspace')} current={step} optional={conceptStep(0)} className="mx-auto hidden min-w-[300px] max-w-[420px] flex-1 xl:flex" />
      <div className="ml-auto flex shrink-0 items-center gap-2 xl:ml-0">
        {secondary}
        {primary}
        <button type="button" onClick={onOpenRight} aria-label={t('workspace.comments')} className={`${iconBtn} relative lg:hidden`}>
          <MessageSquare className="h-5 w-5" />
          {!!openComments && <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-rose-500 px-1 text-center text-[11px] font-semibold leading-4 text-white">{openComments}</span>}
        </button>
        <span aria-hidden className="mx-1 hidden h-6 w-px bg-line sm:block" />
        <UserMenus role={role} showBadge={false} />
      </div>
    </header>
  );
}
