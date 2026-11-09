import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ImageOff } from 'lucide-react';
import { Button, EmptyState, ErrorState, Input, Skeleton, StatusChip } from '@/components/ui';
import { errorText, t } from '@/i18n';
import { fetchBlobUrl } from '@/services/authService';
import { designApi } from './designApi';
import { elementCategory, elementName, formatVnd, isNotChosenItem, isUnknownItem, productSize } from './logic';
import type { DesignElement, ProductOption, Role } from './types';

interface Props {
  role: Role;
  element: DesignElement | null;
  elements: DesignElement[];
  editable: boolean;
  onSelect: (e: DesignElement) => void;
  onChange: (patch: Partial<DesignElement>) => void;
  onChooseAllRemaining: (count: number) => void;
  /** Opens the catalog drawer for the item's category. */
  onBrowse?: () => void;
  /** The viewer may comment: shows how to do it from the drawing. */
  canComment: boolean;
  /** "Next not chosen" and "Keep current for all": they work on the whole version, so Lead only. */
  leadTools: boolean;
  /** Who is in charge of this item's room. */
  note?: string;
  noteAvatar?: ReactNode;
  /** Lead on a room assigned to someone else. */
  onTakeOver?: () => void;
  /** Old → new product of this item, shown during Compare before merge. */
  change?: ReactNode;
}

/** Product image behind auth: fetched as a blob URL. */
export function Thumb({ path, className = 'h-10 w-10' }: { path: string | null; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (path) fetchBlobUrl(path).then((u) => alive && setSrc(u), () => undefined);
    return () => { alive = false; };
  }, [path]);
  return src
    ? <img src={src} alt="" className={`shrink-0 rounded-lg bg-slate-100 object-cover ${className}`} />
    : <div aria-hidden className={`flex shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-300 ${className}`}><ImageOff className="h-1/3 w-1/3" /></div>;
}

const ALT_SHOWN = 6;

export function ItemPanel({ role, element: e, elements, editable, onSelect, onChange, onChooseAllRemaining, onBrowse, canComment, leadTools, note, noteAvatar, onTakeOver, change }: Props) {
  const designer = role === 'designer';
  const [options, setOptions] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const unknown = elements.filter(isUnknownItem);
  const notChosen = elements.filter(isNotChosenItem);
  const nextNotChosen = notChosen.find((x) => x.id !== e?.id);
  const elementId = e && !isUnknownItem(e) ? e.id : null;

  useEffect(() => {
    let alive = true;
    if (elementId) designApi.listProductOptions(elementId).then((o) => alive && setOptions(o), (err) => alive && setError(errorText(err)));
    return () => { alive = false; setOptions(null); setError(''); };
  }, [elementId, reload]);

  if (!e) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <EmptyState compact title={t(designer ? 'items.empty' : 'items.emptyView')} />
        {leadTools && !!notChosen.length && (
          <Button size="sm" onClick={() => onSelect(notChosen[0])}>{t('ws.firstNotChosen', { n: notChosen.length })}</Button>
        )}
      </div>
    );
  }

  const choice = isUnknownItem(e) ? 'UNIDENTIFIED' : e.product ? 'CHOSEN' : 'NOT_CHOSEN';
  const mountM = e.overrides?.mountHeight ?? (e.product?.specifications?.mountHeight as number | undefined);
  const alts = (options ?? []).filter((p) => p.id !== e.product?.id);
  const size = e.product ? productSize(e.product) : null;

  return (
    <div className="h-full min-h-0 space-y-4 overflow-y-auto p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">{elementCategory(e, role)}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{t('items.size', { w: e.width_mm, d: e.depth_mm })} · {t('ws.footprintNote')}</p>
        </div>
        <StatusChip kind="choice" value={choice} size="sm" />
      </div>

      {change && <div className="rounded-lg border border-brand/30 bg-brand-soft/40 p-2.5">{change}</div>}

      {(note || onTakeOver) && (
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-slate-700">{noteAvatar}<span className="min-w-0">{note}</span></p>
          {onTakeOver && <Button size="sm" className="shrink-0" onClick={onTakeOver}>{t('team.takeOver')}</Button>}
        </div>
      )}

      {e.product ? (
        <div className="flex gap-3 rounded-card border border-line p-3">
          <Thumb path={e.product.thumbnail_url} className="h-20 w-20" />
          <div className="min-w-0 flex-1 text-[13px]">
            <p className="font-semibold leading-snug text-slate-900">{e.product.name}</p>
            {e.product.unavailable && <p className="mt-0.5 text-xs font-medium text-rose-700">{t('drafts.noLongerAvailable')}</p>}
            <p className="mt-0.5 truncate text-slate-500">{e.product.supplier_name}</p>
            {size && <p className="mt-0.5 tabular-nums text-slate-500">{size}</p>}
            <p className="mt-1 font-semibold tabular-nums text-slate-900">{e.product.unit_price ? formatVnd(e.product.unit_price) : '—'}</p>
          </div>
        </div>
      ) : !isUnknownItem(e) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">{t('ws.noProductYet', { name: elementName(e, role) })}</p>
      )}

      {canComment && <p className="text-xs text-slate-500">{t('ws.pressCToComment')}</p>}

      {isUnknownItem(e) && (
        <p className="rounded-lg bg-slate-100 px-3 py-2.5 text-[13px] text-slate-700">{designer ? t('items.unknownHelp', { block: e.block_name }) : `${t('reasons.unknownCustomer')}.`}</p>
      )}

      {editable && (e.element_type === 'DECOR' || e.element_type === 'LIGHTING') && (
        <div className="grid grid-cols-2 items-end gap-3 rounded-lg border border-line p-3">
          <label className="text-xs font-medium text-slate-700">{t('items.mountHeight')}
            <Input type="number" step={50} min={0} className="mt-1" value={mountM == null ? '' : Math.round(mountM * 1000)}
              onChange={(ev) => onChange({ overrides: { ...e.overrides, mountHeight: ev.target.value === '' ? undefined : Number(ev.target.value) / 1000 } })} />
          </label>
          {e.element_type === 'LIGHTING' && (
            <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand" checked={e.overrides?.on !== false} onChange={(ev) => onChange({ overrides: { ...e.overrides, on: ev.target.checked } })} />
              {t('items.lightOn')}
            </label>
          )}
        </div>
      )}

      {elementId && (
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h4 className="text-[13px] font-semibold text-slate-800">{t('ws.alternatives')}</h4>
            {onBrowse && <button type="button" onClick={onBrowse} className="rounded text-xs font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">{t('ws.browseCatalog')}</button>}
          </div>
          {error ? <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} /> : !options ? (
            <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : !alts.length ? <EmptyState compact title={t('ws.noAlternatives')} /> : (
            <ul className="grid grid-cols-2 gap-2">
              {alts.slice(0, ALT_SHOWN).map((p) => (
                <li key={p.id} className="flex flex-col rounded-lg border border-line p-2 text-xs">
                  <Thumb path={p.thumbnail_url} className="aspect-[4/3] w-full" />
                  <p className="mt-1.5 line-clamp-2 font-medium leading-snug text-slate-900">{p.name}</p>
                  <p className="truncate text-slate-500">{p.supplier_name}</p>
                  <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
                    <span className="font-semibold tabular-nums text-slate-900">{formatVnd(p.unit_price)}</span>
                    {editable && <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onChange({ product: p, choice: 'CHOSEN' })}>{t('ws.swap')}</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}


      {leadTools && !!notChosen.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[13px] font-medium text-amber-900">{t('items.notChosen', { n: notChosen.length })}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {nextNotChosen && <Button size="sm" onClick={() => onSelect(nextNotChosen)}>{t('items.nextNotChosen')}</Button>}
            <Button size="sm" onClick={() => onChooseAllRemaining(notChosen.length)}>{t('items.keepCurrent', { n: notChosen.length })}</Button>
          </div>
        </div>
      )}

      {!!unknown.length && designer && (
        <div className="rounded-lg border border-line bg-slate-50 p-3">
          <p className="text-[13px] font-medium text-slate-800">{t('items.unknownTitle', { n: unknown.length })}</p>
          <ul className="mt-1 space-y-0.5">
            {unknown.map((u) => (
              <li key={u.id}><button type="button" className="rounded font-mono text-[13px] text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand" onClick={() => onSelect(u)}>{u.block_name}</button></li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-slate-500">{t('items.renameHint')}</p>
        </div>
      )}
    </div>
  );
}
