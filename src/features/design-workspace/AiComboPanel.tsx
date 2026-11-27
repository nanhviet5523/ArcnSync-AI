import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Banner, Button, EmptyState, Field, Input, Modal, Select, Skeleton, StatusChip, Textarea } from '@/components/ui';
import { formatDateTime, formatMoney, t } from '@/i18n';
import { aiApi } from '@/features/ai/aiApi';
import type { AiQuota } from '@/features/ai/aiApi';
import { recommendationApi } from '@/features/ai/recommendationApi';
import type { AiAcceptance, AiRecommendation, AiRecommendationCandidate } from '@/features/ai/recommendationApi';
import { ELEMENTS_MAX, NOTE_MAX, VARIANT_KEYS, candidateTotal, classifyRecError, comboRequest, isNegativeMoney, scopeEmpty, sendableItemIds } from '@/features/ai/recommendationLogic';
import type { ComboForm, ComboFormError, ComboItem, RecError } from '@/features/ai/recommendationLogic';

import { Thumb } from './ItemPanel';

/** A room of the dialog's list; disabled when it has no item the AI suggests for. */
export interface ComboRoom { id: string; name: string; disabled: boolean }

/** Opens the create dialog: from the panel's button (nothing set), a room's button in the sidebar, or the Shift+click picks. */
export interface ComboStart { roomId?: string; elementIds?: string[] }

/** The option shown on the 3D view in place of the drawing's products (nothing saved). */
export interface ComboPreview { recId: string; index: number }

const PAGE = 10;

/** What the page does for an error the panel cannot settle on its own. */
export interface RecActions {
  /** Assignments or the project changed: read the page again. */
  onReload: () => void;
  /** A newer version exists: open it (the backend may name it). */
  onLatest: (currentVersionId?: string | null) => void;
}

interface PanelProps extends RecActions {
  projectId: string;
  versionId: string;
  /** Designer on the current RENDER_3D version during product selection. Staff and Admin only read. */
  canCreate: boolean;
  /** Rooms the viewer may choose products in. */
  rooms: ComboRoom[];
  /** Room to pick first in the dialog. */
  defaultRoomId: string | null;
  /** Items offered under "Some items": the room on screen, else the floor; only ones the viewer may change and the AI suggests for. */
  items: ComboItem[];
  itemsWhere: string;
  selectedId: string | null;
  roomName: (roomId: string) => string;
  itemName: (elementId: string) => string;
  /** Items to tint on the drawing while an option's line is hovered; [] clears. */
  onHover: (elementIds: string[]) => void;
  /** Option accepted: put its selections in the editor (not saved yet). */
  onApply: (a: AiAcceptance) => void;
  /** Create dialog open with this start, null = closed. Kept by the page so the sidebar and the 3D picks can open it. */
  start: ComboStart | null;
  onStart: (s: ComboStart | null) => void;
  preview: ComboPreview | null;
  /** "View on 3D" an option, or null to put the drawing's own models back. */
  onPreview: (rec: AiRecommendation, c: AiRecommendationCandidate | null) => void;
}

const errorLine = (e: RecError) => t(e.messageKey, e.params);

/** The error, with "Open the latest version" when a newer version made the request fail. */
function RecErrorBanner({ error, onLatest, action }: { error: RecError; onLatest: RecActions['onLatest']; action?: ReactNode }) {
  const latest = error.action === 'latest' ? <Button size="sm" onClick={() => onLatest(error.currentVersionId)}>{t('aiCombo.viewLatest')}</Button> : null;
  return <Banner tone="rose" action={latest ?? action}>{errorLine(error)}</Banner>;
}

/** Right column AI tab: earlier suggestions of the version, one opened with its options, and the create dialog. */
export function AiComboPanel(p: PanelProps) {
  const { projectId, versionId, canCreate, onReload, onLatest } = p;
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [list, setList] = useState<AiRecommendation[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listError, setListError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState<AiRecommendation | null>(null);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<RecError | null>(null);
  const seq = useRef(0);
  const quotaFull = !!quota && quota.used >= quota.limit;

  const loadList = useCallback(async (next = 1) => {
    const n = ++seq.current;
    if (next > 1) setLoadingMore(true);
    try {
      const r = await recommendationApi.list(versionId, next, PAGE);
      if (n !== seq.current) return;
      setList((old) => (next > 1 && old ? [...old, ...r.items.filter((x) => !old.some((o) => o.id === x.id))] : r.items));
      setTotal(r.total);
      setPage(next);
      setListError('');
    } catch (e) {
      if (n === seq.current) setListError(errorLine(classifyRecError(e)));
    } finally { if (n === seq.current) setLoadingMore(false); }
  }, [versionId]);

  useEffect(() => { Promise.resolve().then(() => loadList(1)); }, [loadList]);
  // the list answer has no quota: read it from the AI chat list, as the assistant page does
  useEffect(() => {
    if (!canCreate) return;
    let alive = true;
    aiApi.listConversations(projectId, 1, 1).then((r) => alive && setQuota(r.quota), () => undefined);
    return () => { alive = false; };
  }, [projectId, canCreate]);

  const replace = (r: AiRecommendation) => {
    setOpen((o) => (o?.id === r.id ? r : o));
    setList((l) => l?.map((x) => (x.id === r.id ? r : x)) ?? l);
  };
  /** Opens a suggestion now and reads it again for today's prices. Another suggestion ends the 3D preview. */
  const openRec = (r: AiRecommendation) => {
    if (p.preview && p.preview.recId !== r.id) p.onPreview(r, null);
    setOpen(r);
    setDetailError(null);
    p.onHover([]);
    recommendationApi.get(r.id).then(replace, (e) => {
      const c = classifyRecError(e);
      if (c.action === 'refresh') { setOpen(null); loadList(1); }
      setDetailError(c);
    });
  };
  const closeRec = () => {
    if (open && p.preview) p.onPreview(open, null);
    setOpen(null); setDetailError(null); p.onHover([]);
  };

  /** Side effects of an error; 'latest' waits for the reader to press "Open the latest version". */
  const handle = (c: RecError) => {
    if (c.action === 'quota') setQuota((q) => (q ? { ...q, used: q.limit } : q));
    if (c.action === 'reload') onReload();
  };

  const accept = async (r: AiRecommendation, index: number) => {
    if (accepting !== null) return;
    setAccepting(index);
    setDetailError(null);
    try {
      const a = await recommendationApi.accept(r.id, index);
      replace(a.recommendation);
      p.onApply(a);
    } catch (e) {
      const c = classifyRecError(e);
      setDetailError(c);
      if (c.action === 'refresh') openRec(r);
      handle(c);
    } finally { setAccepting(null); }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 space-y-2 border-b border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold text-ink"><Sparkles aria-hidden className="h-4 w-4 text-brand" />{t('aiCombo.title')}</h2>
          {canCreate && (
            <Button size="sm" variant="primary" disabled={quotaFull} title={quotaFull ? t('aiCombo.quotaFull') : undefined} onClick={() => p.onStart({})}>
              {t('aiCombo.suggest')}
            </Button>
          )}
        </div>
        <p className="text-xs leading-5 text-subtext">{canCreate ? t('aiCombo.intro') : t('aiCombo.viewOnly')}</p>
        {canCreate && quota && (
          <p className={`text-xs tabular-nums ${quotaFull ? 'font-medium text-rose-600' : 'text-ink-2'}`}>
            {quotaFull ? t('aiCombo.quotaFull') : t('aiCombo.quota', { left: Math.max(0, quota.limit - quota.used), limit: quota.limit })}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {open ? (
          <RecommendationDetail key={open.id} rec={open} canApply={canCreate} accepting={accepting} error={detailError}
            onBack={closeRec} onAccept={(i) => accept(open, i)} onHover={p.onHover} onLatest={onLatest}
            previewIndex={p.preview?.recId === open.id ? p.preview.index : null}
            onPreview={(c) => p.onPreview(open, c)}
            roomName={p.roomName} itemName={p.itemName} />
        ) : (
          <section aria-label={t('aiCombo.history')} className="space-y-2 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-subtext">{t('aiCombo.history')}</h3>
            {listError && <Banner tone="rose" action={<Button size="sm" onClick={() => loadList(1)}>{t('common.retry')}</Button>}>{listError}</Banner>}
            {detailError && <RecErrorBanner error={detailError} onLatest={onLatest} />}
            {!list && !listError && <><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></>}
            {list && !list.length && <EmptyState compact title={t('aiCombo.noHistory')} />}
            {list?.map((r) => (
              <button key={r.id} type="button" onClick={() => openRec(r)}
                className="block w-full rounded-lg border border-line p-3 text-left transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-brand">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {r.roomId ? t('aiCombo.forRoom', { room: p.roomName(r.roomId) }) : t('aiCombo.forItems', { n: r.designElementIds.length })}
                </span>
                {r.note && <span className="mt-0.5 block truncate text-xs text-ink-2">{r.note}</span>}
                <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-subtext">
                  <span>{formatDateTime(r.createdAt)}</span>
                  {r.acceptedCandidateIndex !== null
                    ? <StatusChip size="sm" tone="green" label={t('aiCombo.applied', { label: variantOf(r, r.acceptedCandidateIndex) })} />
                    : <span>{t('aiCombo.notApplied')}</span>}
                </span>
              </button>
            ))}
            {list && list.length < total && (
              <Button block size="sm" loading={loadingMore} onClick={() => loadList(page + 1)}>{t('aiCombo.loadMore')}</Button>
            )}
          </section>
        )}
      </div>

      {canCreate && p.start && (
        <AiComboDialog versionId={versionId} rooms={p.rooms} defaultRoomId={p.defaultRoomId} items={p.items} itemsWhere={p.itemsWhere} selectedId={p.selectedId}
          start={p.start} onClose={() => p.onStart(null)} onError={handle} onLatest={onLatest}
          onCreated={({ quota: q, ...r }) => {
            setQuota(q);
            p.onStart(null);
            if (open && p.preview) p.onPreview(open, null);
            setList((l) => [r, ...(l ?? []).filter((x) => x.id !== r.id)]);
            setTotal((n) => n + 1);
            setOpen(r);
            setDetailError(null);
          }} />
      )}
    </div>
  );
}

const variantOf = (r: AiRecommendation, index: number) => {
  const c = r.candidates.find((x) => x.index === index);
  return c ? t(VARIANT_KEYS[c.label]) : `#${index + 1}`;
};

function RecommendationDetail({ rec, canApply, accepting, error, onBack, onAccept, onHover, onLatest, previewIndex, onPreview, roomName, itemName }: {
  rec: AiRecommendation; canApply: boolean; accepting: number | null; error: RecError | null; onLatest: RecActions['onLatest'];
  onBack: () => void; onAccept: (index: number) => void; onHover: (ids: string[]) => void;
  previewIndex: number | null; onPreview: (c: AiRecommendationCandidate | null) => void;
  roomName: (id: string) => string; itemName: (id: string) => string;
}) {
  // the backend's order: the first option is the AI's best match
  const candidates = rec.candidates.slice(0, 3);
  const [expanded, setExpanded] = useState<number | null>(candidates[0]?.index ?? null);
  /** Items outlined after a click on the "no product found" warning; a hovered line outlines its own items meanwhile. */
  const [pinned, setPinned] = useState<string[]>([]);
  const hover = (ids: string[]) => onHover(ids.length ? ids : pinned);
  const togglePinned = () => { const next = pinned.length ? [] : rec.unfilledElementIds; setPinned(next); onHover(next); };
  const toggleCard = (index: number) => {
    // another option ends the preview of this one
    if (previewIndex !== null && previewIndex !== index) onPreview(null);
    setExpanded((x) => (x === index ? null : index));
  };
  const over = isNegativeMoney(rec.budget.projectRemaining);
  return (
    <div className="space-y-3 p-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 rounded text-xs font-medium text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />{t('aiCombo.back')}
      </button>
      <div>
        <h3 className="text-sm font-semibold text-ink">{t('aiCombo.header', {
          scope: rec.roomId ? roomName(rec.roomId) : t('aiCombo.nItems', { n: rec.designElementIds.length }), time: formatDateTime(rec.createdAt),
        })}</h3>
        {rec.note && <p className="mt-1 break-words text-xs text-ink-2">“{rec.note}”</p>}
      </div>
      <p className="text-xs text-ink-2">
        {t('aiCombo.scopeBudget', { amount: formatMoney(rec.budget.scopeBudget) })}
        <span className="text-subtext"> · {t(`aiCombo.budgetSource.${rec.budget.source}`)}</span>
      </p>
      {over && <Banner tone="amber">{t('aiCombo.overProject', { amount: formatMoney(rec.budget.projectRemaining.replace(/^-/, '')) })}</Banner>}
      {!!rec.unfilledElementIds.length && (
        <button type="button" aria-pressed={!!pinned.length} onClick={togglePinned}
          onMouseEnter={() => onHover(rec.unfilledElementIds)} onMouseLeave={() => onHover(pinned)}
          className={`block w-full rounded-lg border px-3 py-2 text-left text-[13px] text-accent-text transition-colors focus-visible:outline-2 focus-visible:outline-brand ${pinned.length ? 'border-accent bg-accent-soft' : 'border-line bg-accent-soft/60 hover:bg-accent-soft'}`}>
          ⚠ {t('aiCombo.unfilled', { n: rec.unfilledElementIds.length })}
          <span className="mt-0.5 block text-xs">{rec.unfilledElementIds.map(itemName).join(', ')}</span>
          <span className="mt-0.5 block text-[11px] text-subtext">{t(pinned.length ? 'aiCombo.unfilledHide' : 'aiCombo.unfilledShow')}</span>
        </button>
      )}
      {error && <RecErrorBanner error={error} onLatest={onLatest} />}
      {candidates.map((c, i) => (
        <CandidateCard key={c.index} c={c} best={i === 0} applied={rec.acceptedCandidateIndex === c.index} autoReason={rec.generationId === null}
          open={expanded === c.index} onToggle={() => toggleCard(c.index)}
          previewing={previewIndex === c.index} onPreview={() => onPreview(previewIndex === c.index ? null : c)}
          canApply={canApply} anyApplied={rec.acceptedCandidateIndex !== null} busy={accepting === c.index} disabled={accepting !== null}
          onAccept={() => onAccept(c.index)} onHover={hover} />
      ))}
    </div>
  );
}

function CandidateCard({ c, best, applied, autoReason, open, onToggle, previewing, onPreview, canApply, anyApplied, busy, disabled, onAccept, onHover }: {
  c: AiRecommendationCandidate; best: boolean; applied: boolean; autoReason: boolean; open: boolean; onToggle: () => void;
  previewing: boolean; onPreview: () => void;
  canApply: boolean; anyApplied: boolean; busy: boolean; disabled: boolean;
  onAccept: () => void; onHover: (ids: string[]) => void;
}) {
  const total = candidateTotal(c);
  const Chevron = open ? ChevronDown : ChevronRight;
  // nothing to show on 3D when every product of the option is no longer sold
  const canPreview = c.items.some((it) => it.available && it.product);
  return (
    <article aria-label={t(VARIANT_KEYS[c.label])} className={`rounded-xl border p-3 ${applied ? 'border-brand bg-brand-soft/40' : previewing ? 'border-accent' : 'border-line'}`}>
      <button type="button" aria-expanded={open} onClick={onToggle}
        className="block w-full rounded text-left focus-visible:outline-2 focus-visible:outline-brand">
        <span className="flex flex-wrap items-center gap-1.5">
          <Chevron aria-hidden className="h-3.5 w-3.5 shrink-0 text-subtext" />
          <h4 className="text-[13px] font-semibold text-ink">{best && <span aria-label={t('aiCombo.best')} title={t('aiCombo.best')} className="mr-1 text-accent">★</span>}{t(VARIANT_KEYS[c.label])}</h4>
          {applied && <StatusChip size="sm" tone="green" label={t('aiCombo.appliedTag')} />}
          <span className="flex-1" />
          <StatusChip size="sm" tone={c.withinBudget ? 'green' : 'amber'} label={t(c.withinBudget ? 'aiCombo.withinBudget' : 'aiCombo.overBudget')} />
        </span>
        <span className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-xs text-subtext">{t('aiCombo.total')}</span>
          <span className="text-sm font-semibold tabular-nums text-ink">{formatMoney(total.amount)}</span>
        </span>
        {total.changed && <span className="block text-right text-[11px] text-accent-text">{t('aiCombo.priceChanged')}</span>}
        {!total.current && <span className="block text-right text-[11px] text-accent-text">{t('aiCombo.priceUnknown')}</span>}
      </button>
      {open && <>
      {c.reason && (
        <p className="mt-2 whitespace-pre-line break-words text-xs leading-5 text-ink-2">
          💬 {c.reason}
          {autoReason && <span className="mt-0.5 block text-[11px] italic text-subtext">{t('aiCombo.autoReason')}</span>}
        </p>
      )}
      <ul className="mt-2 space-y-1">
        {c.items.map((it) => (
          <li key={`${it.productId}-${it.elementIds.join()}`} tabIndex={0}
            onMouseEnter={() => onHover(it.elementIds)} onMouseLeave={() => onHover([])} onFocus={() => onHover(it.elementIds)} onBlur={() => onHover([])}
            className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted focus-visible:outline-2 focus-visible:outline-brand">
            <Thumb path={it.available ? it.product?.thumbnailUrl ?? null : null} className="h-9 w-9" />
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-xs font-medium ${it.available ? 'text-ink' : 'text-subtext line-through'}`}>{it.product?.name ?? it.productName}</span>
              <span className="block text-[11px] tabular-nums text-subtext">
                {it.available ? formatMoney(it.currentPrice ?? it.priceAtRecommend) : <span className="font-medium text-rose-600">{t('aiCombo.discontinued')}</span>}
                {it.quantity > 1 && <> {t('aiCombo.qty', { n: it.quantity })}</>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1" variant={previewing ? 'primary' : 'secondary'} disabled={!canPreview} onClick={onPreview}>
          {previewing ? t('aiCombo.cancelPreview') : t('aiCombo.preview')}
        </Button>
        {canApply && (
          <Button size="sm" className="flex-1" variant={applied ? 'secondary' : 'primary'} loading={busy} disabled={disabled} onClick={onAccept}>
            {anyApplied && !applied ? t('aiCombo.reapply') : t('aiCombo.apply')}
          </Button>
        )}
      </div>
      </>}
    </article>
  );
}

const EMPTY_FORM: ComboForm = { scope: 'room', roomId: '', elementIds: [], includeChosen: false, note: '', budget: '' };

function AiComboDialog({ versionId, rooms, defaultRoomId, items, itemsWhere, selectedId, start, onClose, onCreated, onError, onLatest }: {
  versionId: string; rooms: ComboRoom[]; defaultRoomId: string | null;
  items: ComboItem[]; itemsWhere: string; selectedId: string | null;
  start: ComboStart;
  onClose: () => void;
  onCreated: (r: Awaited<ReturnType<typeof recommendationApi.create>>) => void;
  onError: (e: RecError) => void;
  onLatest: RecActions['onLatest'];
}) {
  const [form, setForm] = useState<ComboForm>(() => {
    // a room's sidebar button or the Shift+click picks name the scope
    if (start.roomId) return { ...EMPTY_FORM, scope: 'room', roomId: start.roomId };
    if (start.elementIds?.length) return { ...EMPTY_FORM, scope: 'items', elementIds: start.elementIds };
    const picked = selectedId && items.some((i) => i.id === selectedId) ? [selectedId] : [];
    const open = rooms.filter((r) => !r.disabled);
    const room = defaultRoomId && open.some((r) => r.id === defaultRoomId) ? defaultRoomId : open[0]?.id ?? '';
    return { ...EMPTY_FORM, roomId: room, elementIds: picked, scope: picked.length && !defaultRoomId ? 'items' : open.length ? 'room' : 'items' };
  });
  /** With "include chosen" off, items that already have a product are greyed out and not sent. */
  const sendable = sendableItemIds(form.elementIds, items, form.includeChosen);
  const greyed = !form.includeChosen && items.some((i) => i.chosen);
  const empty = scopeEmpty({ ...form, elementIds: sendable });
  const [formError, setFormError] = useState<ComboFormError | null>(null);
  const [error, setError] = useState<RecError | null>(null);
  const [busy, setBusy] = useState(false);
  const patch = (x: Partial<ComboForm>) => { setForm((f) => ({ ...f, ...x })); setFormError(null); };

  /** includeChosen: "Suggest again including chosen items" after NOTHING_TO_RECOMMEND sends right away with it on. */
  const submit = async (includeChosen = form.includeChosen) => {
    if (busy) return;
    const f = { ...form, includeChosen };
    const req = comboRequest({ ...f, elementIds: sendableItemIds(f.elementIds, items, includeChosen) });
    if ('error' in req) { setFormError(req.error); return; }
    setBusy(true);
    setError(null);
    try {
      onCreated(await recommendationApi.create(versionId, req.body));
    } catch (e) {
      const c = classifyRecError(e, req.body);
      if (!c.known) console.warn('AI recommendation: unhandled error code', c.code, e);
      setError(c);
      onError(c);
      setBusy(false);
    }
  };
  // the request is counted even if the dialog goes away: keep it open until the answer comes
  const close = () => { if (!busy) onClose(); };
  const fieldError = (k: ComboFormError) => (formError === k ? t(`aiCombo.formErrors.${k}`, { max: k === 'note' ? NOTE_MAX : ELEMENTS_MAX }) : undefined);

  return (
    <Modal title={t('aiCombo.dialogTitle')} size="md" onClose={close} footer={<>
      <Button onClick={close} disabled={busy}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={empty || error?.action === 'quota'}
        title={empty ? t(form.scope === 'room' ? 'aiCombo.formErrors.room' : 'aiCombo.formErrors.items') : undefined} onClick={() => submit()}>{t('aiCombo.generate')}</Button>
    </>}>
      <div className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-ink-2">{t('aiCombo.scope')}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['room', 'items'] as const).map((s) => (
              <label key={s} className={`cursor-pointer rounded-lg border p-2.5 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${form.scope === s ? 'border-brand bg-brand-soft' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="ai-scope" className="sr-only" checked={form.scope === s} disabled={busy} onChange={() => patch({ scope: s })} />
                <span className="font-medium text-ink">{t(s === 'room' ? 'aiCombo.scopeRoom' : 'aiCombo.scopeItems')}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.scope === 'room' ? (
          rooms.length ? (
            <Field label={t('aiCombo.room')} error={fieldError('room')}>
              {(f) => (
                <Select {...f} value={form.roomId} disabled={busy} onChange={(e) => patch({ roomId: e.target.value })}>
                  <option value="" disabled>{t('aiCombo.pickRoom')}</option>
                  {rooms.map((r) => <option key={r.id} value={r.id} disabled={r.disabled}>{r.disabled ? t('aiCombo.roomNoItems', { room: r.name }) : r.name}</option>)}
                </Select>
              )}
            </Field>
          ) : <p className="text-sm text-subtext">{t('aiCombo.noRooms')}</p>
        ) : (
          <fieldset>
            <legend className="mb-1 text-[13px] font-medium text-ink-2">{t('aiCombo.items')}</legend>
            <p className="mb-1.5 text-xs text-subtext">{t('aiCombo.itemsHint', { where: itemsWhere })}</p>
            {items.length ? (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border border-line p-2">
                {items.map((i) => {
                  const off = i.chosen && !form.includeChosen;
                  return (
                    <label key={i.id} className={`flex items-center gap-2 text-sm ${off ? 'cursor-not-allowed text-subtext opacity-60' : 'text-ink-2'}`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-line-strong" disabled={busy || off} checked={sendable.includes(i.id)}
                        onChange={(e) => patch({ elementIds: e.target.checked ? [...form.elementIds, i.id] : form.elementIds.filter((x) => x !== i.id) })} />
                      <span className="min-w-0 flex-1 truncate">{i.name}</span>
                      {i.chosen && <span className="shrink-0 text-[11px] text-subtext">{t('aiCombo.hasProduct')}</span>}
                    </label>
                  );
                })}
              </div>
            ) : <p className="text-sm text-subtext">{t('aiCombo.itemsNone')}</p>}
            {greyed && <p className="mt-1 text-xs text-subtext">{t('aiCombo.chosenHint')}</p>}
            <p className="mt-1 text-xs text-subtext">{t('aiCombo.itemsCount', { n: sendable.length })}</p>
            {(formError === 'items' || formError === 'tooManyItems') && <p role="alert" className="mt-1 text-xs text-rose-600">{fieldError(formError)}</p>}
          </fieldset>
        )}

        <label className="flex items-start gap-2 text-sm text-ink-2">
          <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-line-strong" disabled={busy} checked={form.includeChosen} onChange={(e) => patch({ includeChosen: e.target.checked })} />
          {t('aiCombo.includeChosen')}
        </label>

        <Field label={t('aiCombo.note')} optional error={fieldError('note')}>
          {(f) => <Textarea {...f} rows={2} maxLength={NOTE_MAX} value={form.note} disabled={busy} placeholder={t('aiCombo.notePlaceholder')} onChange={(e) => patch({ note: e.target.value })} />}
        </Field>
        <Field label={t('aiCombo.budget')} optional hint={t('aiCombo.budgetHint')} error={fieldError('budget')}>
          {(f) => <Input {...f} inputMode="numeric" value={form.budget} disabled={busy} placeholder="60,000,000" onChange={(e) => patch({ budget: e.target.value })} />}
        </Field>

        {busy && <p role="status" className="text-xs text-subtext">{t('aiCombo.generating')}</p>}
        {error && (
          <RecErrorBanner error={error} onLatest={onLatest} action={
            error.action === 'includeChosen' && !form.includeChosen ? <Button size="sm" loading={busy} onClick={() => { patch({ includeChosen: true }); setError(null); submit(true); }}>{t('aiCombo.turnOnIncludeChosen')}</Button>
              : undefined
          } />
        )}
      </div>
    </Modal>
  );
}
