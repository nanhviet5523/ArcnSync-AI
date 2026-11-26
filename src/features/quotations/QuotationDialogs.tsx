import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Textarea } from '@/components/ui';
import { errorText, formatMoney, t } from '@/i18n';
import { Thumb } from '@/features/design-workspace/ItemPanel';
import { quotationApi, reasonWithTried, REASON_MAX, signedMoney, todayVn } from './quotationApi';
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

/** Staff sets the draft's expiry (the only field the backend lets them change). Empty = today + 14 days when sent. */
export function ValidUntilDialog({ initial, onSubmit, onClose }: {
  initial: string | null; onSubmit: (validUntil: string | null) => Promise<void>; onClose: () => void;
}) {
  const [value, setValue] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const today = todayVn();
  const invalid = value !== '' && value < today;
  const submit = async () => {
    if (invalid) return;
    setBusy(true); setError('');
    try { await onSubmit(value || null); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={t('quotation.editValidUntil')} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={invalid} onClick={submit}>{t('common.save')}</Button>
    </>}>
      <div className="space-y-4">
        <Field label={t('quotation.validUntilField')} hint={t('quotation.validUntilHint')} optional error={invalid ? t('errors.QUOTATION_VALID_UNTIL_PAST') : undefined}>
          {(p) => <Input {...p} type="date" min={today} value={value} invalid={invalid} onChange={(e) => setValue(e.target.value)} className="w-48" />}
        </Field>
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}

/**
 * Products of the same category as the line, cheapest first. "Use this" adds a what-if option: it only changes the
 * estimate on the page, nothing is saved.
 */
export function OptionsDialog({ item, elementId, picked, onPick, onClose }: {
  item: QuotationItem; elementId: string; picked: ProductOption | undefined;
  onPick: (option: ProductOption | null) => void; onClose: () => void;
}) {
  const [options, setOptions] = useState<ProductOption[] | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    quotationApi.options(elementId).then((o) => alive && setOptions(o), (e) => alive && setError(errorText(e)));
    return () => { alive = false; };
  }, [elementId, reload]);

  const qty = Number(item.quantity);
  const chosenId = picked?.id ?? item.productId;
  return (
    <Modal title={t('quotation.tryTitle', { name: item.productName })} size="md" onClose={onClose}
      footer={<>
        {picked && <Button onClick={() => { onPick(null); onClose(); }}>{t('quotation.undo')}</Button>}
        <Button onClick={onClose}>{t('common.close')}</Button>
      </>}>
      <p className="mb-3 text-[13px] text-slate-600">{t('quotation.tryHint')}</p>
      {error ? <ErrorState message={error} onRetry={() => { setError(''); setOptions(null); setReload((n) => n + 1); }} />
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
                    <p className="truncate text-sm font-semibold text-ink">{o.name}</p>
                    <p className="truncate text-xs text-slate-500">{[o.supplierName, o.sku].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-ink">{formatMoney(o.price)}</p>
                    {!isLine && <p className={`text-xs tabular-nums ${delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-rose-700' : 'text-slate-500'}`}>{signedMoney(delta)}</p>}
                  </div>
                  <div className="w-24 text-right">
                    {isLine && !picked ? <span className="text-xs font-semibold text-slate-500">{t('quotation.current')}</span>
                      : isChosen ? <span className="text-xs font-semibold text-brand">{t('quotation.trying')}</span>
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

/**
 * Homeowner asks for changes. The backend only takes a reason, so the products tried on the page are added to it as
 * text (shown before sending) for Lead to read.
 */
export function RequestChangesDialog({ triedLines, onSubmit, onClose }: {
  triedLines: string[]; onSubmit: (reason: string) => Promise<void>; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [include, setInclude] = useState(triedLines.length > 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const full = reasonWithTried(reason.trim(), t('quotation.triedHeader'), include ? triedLines : []);
  const submit = async () => {
    setBusy(true); setError('');
    try { await onSubmit(full); onClose(); } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title={t('quotation.requestChangesTitle')} size="md" onClose={onClose} footer={<>
      <Button onClick={onClose}>{t('common.cancel')}</Button>
      <Button variant="primary" loading={busy} disabled={!reason.trim()} onClick={submit}>{t('quotation.requestChanges')}</Button>
    </>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">{t('quotation.requestChangesHint')}</p>
        <Field label={t('quotation.reason')}>
          {(p) => <Textarea {...p} autoFocus rows={4} maxLength={REASON_MAX} placeholder={t('quotation.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        {triedLines.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand" checked={include} onChange={(e) => setInclude(e.target.checked)} />
              {t('quotation.includeOptions', { n: triedLines.length })}
            </label>
            {include && (
              <ul className="space-y-1 rounded-lg bg-sand-50 px-3 py-2 text-[13px] text-slate-700">
                {triedLines.map((l) => <li key={l}>{l}</li>)}
              </ul>
            )}
          </div>
        )}
        {error && <ErrorState message={error} />}
      </div>
    </Modal>
  );
}
