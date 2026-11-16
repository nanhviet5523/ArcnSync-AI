import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { errorText, formatMoney, t } from '@/i18n';
import { Thumb } from '@/features/design-workspace/ItemPanel';
import { parseMoneyInput, quotationApi, signedMoney, todayVn } from './quotationApi';
import type { ProductOption, QuotationItem } from './quotationApi';

/** Confirmation with one primary action; the caller runs the request and closes on success. */
export function ConfirmDialog({ title, body, confirm, danger, onConfirm, onClose }: {
  title: string; body: ReactNode; confirm: string; danger?: boolean; onConfirm: () => Promise<void>; onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true); setError('');
    try { await onConfirm(); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={title} onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirm}</Button>
    </>}>
      <div className="space-y-3 text-sm text-slate-700">
        {typeof body === 'string' ? <p>{body}</p> : body}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

export interface TermsValue { discountAmount: string; note: string; validUntil: string; applyRequestedChanges: boolean }

/** Create a quotation (with "apply requested changes" when the last one was rejected) or edit the draft's terms. */
export function TermsDialog({ title, hint, initial, requestedCount = 0, submitLabel, onSubmit, onClose }: {
  title: string; hint?: string; initial: TermsValue; requestedCount?: number; submitLabel: string;
  onSubmit: (v: TermsValue) => Promise<void>; onClose: () => void;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = todayVn();
  const discount = parseMoneyInput(v.discountAmount);
  const discountInvalid = discount === null;
  const dateInvalid = v.validUntil !== '' && v.validUntil < today;
  const submit = async () => {
    if (discount === null || dateInvalid) return;
    setBusy(true); setError('');
    try { await onSubmit({ ...v, discountAmount: discount, note: v.note.trim() }); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={title} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={discountInvalid || dateInvalid} onClick={submit}>{submitLabel}</Button>
    </>}>
      <div className="space-y-4">
        {hint && <p className="text-sm text-slate-600">{hint}</p>}
        <Field label={t('quotation.discount')}
          hint={discount && Number(discount) > 0 ? `${t('quotation.discountPreview', { amount: formatMoney(discount) })} · ${t('quotation.discountHint')}` : t('quotation.discountHint')}
          error={discountInvalid ? t('common.checkValue') : undefined}>
          {(p) => <Input {...p} inputMode="decimal" value={v.discountAmount} invalid={discountInvalid} onChange={(e) => setV({ ...v, discountAmount: e.target.value })} />}
        </Field>
        <Field label={t('quotation.validUntilField')} hint={t('quotation.validUntilHint')} optional error={dateInvalid ? t('errors.VALID_UNTIL_IN_PAST') : undefined}>
          {(p) => <Input {...p} type="date" min={today} value={v.validUntil} invalid={dateInvalid} onChange={(e) => setV({ ...v, validUntil: e.target.value })} className="w-48" />}
        </Field>
        <Field label={t('quotation.note')} optional>
          {(p) => <Textarea {...p} rows={4} maxLength={5000} placeholder={t('quotation.notePlaceholder')} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />}
        </Field>
        {requestedCount > 0 && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={v.applyRequestedChanges} onChange={(e) => setV({ ...v, applyRequestedChanges: e.target.checked })} />
            {t('quotation.applyRequested', { n: requestedCount })}
          </label>
        )}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

/**
 * Products of the same category as the line, cheapest first. "Use this" either stages a swap (staff, draft) or adds a
 * what-if option (everyone else); the parent decides what the pick means.
 */
export function OptionsDialog({ item, picked, mode, onPick, onClose }: {
  item: QuotationItem; picked: ProductOption | undefined; mode: 'swap' | 'try';
  onPick: (option: ProductOption | null) => void; onClose: () => void;
}) {
  const [options, setOptions] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const elementId = item.elementIds[0];
  useEffect(() => {
    if (!elementId || !item.categoryId) return;
    let alive = true;
    quotationApi.options(elementId).then((o) => alive && setOptions(o), (e) => alive && setError(errorText(e)));
    return () => { alive = false; };
  }, [elementId, item.categoryId, reload]);

  const qty = Number(item.quantity);
  const chosenId = picked?.id ?? item.productId;
  return (
    <Modal title={t(mode === 'swap' ? 'quotation.replaceTitle' : 'quotation.tryTitle', { name: item.productName })} size="md" onClose={onClose}
      footer={<>
        {picked && <Button onClick={() => { onPick(null); onClose(); }}>{t('quotation.undo')}</Button>}
        <Button onClick={onClose}>{t('common.close')}</Button>
      </>}>
      <p className="mb-3 text-[13px] text-slate-600">{t(mode === 'swap' ? 'quotation.replaceHint' : 'quotation.tryHint')}</p>
      {!item.categoryId || !elementId ? <EmptyState compact title={t('quotation.noCategory')} />
        : error ? <ErrorState message={error} onRetry={() => { setError(''); setOptions(null); setReload((n) => n + 1); }} />
        : !options ? <div aria-busy="true" className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        : options.filter((o) => o.id !== item.productId).length === 0 ? <EmptyState compact title={t('quotation.noOptions')} />
        : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-line">
            {options.map((o) => {
              const isLine = o.id === item.productId;
              const isChosen = o.id === chosenId;
              const delta = (Number(o.price) - Number(item.unitPrice)) * qty;
              return (
                <li key={o.id} className={`flex items-center gap-3 px-3 py-2.5 ${isChosen ? 'bg-brand-soft' : ''}`}>
                  <Thumb path={o.thumbnailUrl} className="h-12 w-12" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{o.name}</p>
                    <p className="truncate text-xs text-slate-500">{[o.supplierName, o.sku].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">{formatMoney(o.price)}</p>
                    {!isLine && <p className={`text-xs tabular-nums ${delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{signedMoney(delta)}</p>}
                  </div>
                  <div className="w-24 text-right">
                    {isLine && !picked ? <span className="text-xs font-semibold text-slate-500">{t('quotation.current')}</span>
                      : isChosen ? <span className="text-xs font-semibold text-brand">{t(mode === 'swap' ? 'quotation.current' : 'quotation.trying')}</span>
                      : <Button size="sm" onClick={() => { onPick(isLine ? null : o); onClose(); }}>{t('quotation.pick')}</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </Modal>
  );
}

/** Homeowner asks for changes: a reason, plus the products they tried on this page. */
export function RejectDialog({ triedCount, onSubmit, onClose }: {
  triedCount: number; onSubmit: (reason: string, includeTried: boolean) => Promise<void>; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [include, setInclude] = useState(triedCount > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try { await onSubmit(reason.trim(), include); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={t('quotation.rejectTitle')} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={!reason.trim()} onClick={submit}>{t('quotation.requestChanges')}</Button>
    </>}>
      <div className="space-y-4">
        <Field label={t('quotation.reason')}>
          {(p) => <Textarea {...p} autoFocus rows={4} maxLength={2000} placeholder={t('quotation.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {triedCount > 0 && (
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-blue-600" checked={include} onChange={(e) => setInclude(e.target.checked)} />
            {t('quotation.includeOptions', { n: triedCount })}
          </label>
        )}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
