import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Sparkles } from 'lucide-react';
import { AppShell, Banner, Button, Card, DetailList, EmptyState, ErrorState, PageHeader, Skeleton, StatusChip } from '@/components/ui';
import { errorText, formatDate, formatDateTime, formatMoney, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { projectApi } from '@/features/projects/projectApi';
import type { Project } from '@/features/projects/projectApi';
import { budgetStatusOf, estimateWith, quotationApi, signedMoney, todayVn } from './quotationApi';
import type { ProductOption, Quotation, QuotationItem, QuotationSummary } from './quotationApi';
import { ConfirmDialog, OptionsDialog, RejectDialog, TermsDialog } from './QuotationDialogs';
import type { TermsValue } from './QuotationDialogs';

type Dialog =
  | { kind: 'create' } | { kind: 'terms' } | { kind: 'send' } | { kind: 'withdraw' } | { kind: 'approve' } | { kind: 'reject' }
  | { kind: 'options'; item: QuotationItem };

const projectHome = (role: string, id: string) =>
  role === 'homeowner' ? `/homeowner/projects/${id}` : role === 'designer' ? `/designer/projects/${id}` : `/staff/projects/${id}`;

/**
 * Quotation / BOM of a project (/projects/:projectId/quotation): lines grouped by category, comparison with the budget,
 * "Try options" per line, revisions. Staff in charge (or admin) creates, edits, swaps products and sends;
 * the homeowner approves (project completes) or asks for changes with the products they tried.
 */
export function QuotationPage() {
  const { projectId = '' } = useParams();
  const user = getCurrentUser();
  const role = user?.role ?? 'homeowner';
  const [project, setProject] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<QuotationSummary[] | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  /** Product picked per line: a what-if option, or (staff, draft) a swap waiting to be saved. */
  const [picked, setPicked] = useState<Record<string, ProductOption>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (id?: string | null) => {
    setError('');
    try {
      const [p, list] = await Promise.all([projectApi.get(projectId), quotationApi.list(projectId)]);
      setProject(p);
      setRevisions(list);
      const target = id && list.some((q) => q.id === id) ? id : list[0]?.id ?? null;
      setSelectedId(target);
      setQuotation(target ? await quotationApi.get(target) : null);
      setPicked({});
    } catch (e) { setError(errorText(e)); }
  }, [projectId, setPicked]);
  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const homeowner = role === 'homeowner';
  const manager = !!project && (role === 'admin' || (role === 'staff' && project.staff.id === user?.id));
  const latest = revisions?.[0] ?? null;
  const isLatest = !!quotation && quotation.id === latest?.id;
  const draft = manager && isLatest && quotation?.status === 'DRAFT';
  const swapMode = draft;
  const expired = !!quotation?.validUntil && quotation.status === 'SENT' && quotation.validUntil < todayVn();
  const canCreate = manager && project?.status === 'QUOTING' && (!latest || latest.status === 'REJECTED');
  const pickedCount = Object.keys(picked).length;
  // what-if total (homeowner trying options) or the total after saving staff's pending swaps
  const estimate = useMemo(() => (quotation && pickedCount ? estimateWith(quotation, picked) : null), [quotation, picked, pickedCount]);
  /** Create (or the next revision) always starts from the latest one, so its requested changes are offered. */
  const startCreate = async () => {
    if (latest && quotation?.id !== latest.id) await load(latest.id);
    setDialog({ kind: 'create' });
  };

  /** Runs an action that returns the updated quotation, then refreshes the revision list. */
  const act = async (fn: () => Promise<Quotation>) => {
    setActionError('');
    const q = await fn();
    await load(q.id);
  };

  const saveSwaps = async () => {
    if (!quotation) return;
    setSaving(true); setActionError('');
    try {
      await act(() => quotationApi.update(quotation.id, { replacements: Object.entries(picked).map(([itemId, o]) => ({ itemId, productId: o.id })) }));
    } catch (e) { setActionError(errorText(e)); } finally { setSaving(false); }
  };

  const exportCsv = async () => {
    if (!quotation) return;
    setActionError('');
    try { await quotationApi.exportCsv(quotation); } catch (e) { setActionError(errorText(e)); }
  };

  const back = { to: projectHome(role, projectId), label: t('quotation.back') };

  if (error) return <AppShell><PageHeader back={back} title={t('quotation.title')} /><ErrorState message={error} onRetry={() => load(selectedId)} /></AppShell>;
  if (!project || !revisions) {
    return (
      <AppShell wide>
        <Skeleton className="mb-3 h-4 w-24" /><Skeleton className="mb-6 h-8 w-80 max-w-full" />
        <div className="grid gap-5 lg:grid-cols-3"><Skeleton className="h-96 w-full lg:col-span-2" /><Skeleton className="h-96 w-full" /></div>
      </AppShell>
    );
  }

  // ----- no quotation yet -----
  if (!quotation) {
    const message = canCreate ? t('quotation.empty.staff')
      : project.status === 'QUOTING' ? t(homeowner ? 'quotation.empty.waitingStaff' : 'quotation.empty.waitingTeam')
      : t('quotation.empty.notQuoting');
    return (
      <AppShell wide>
        <PageHeader back={back} title={t('quotation.title')} description={`${project.code} · ${project.title}`} />
        <EmptyState title={message} action={canCreate ? <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>{t('quotation.create')}</Button> : undefined} />
        {dialog?.kind === 'create' && (
          <TermsDialog title={t('quotation.createTitle')} hint={t('quotation.createHint')} submitLabel={t('quotation.create')}
            initial={{ discountAmount: '0', note: '', validUntil: '', applyRequestedChanges: false }}
            onSubmit={(v) => act(() => quotationApi.create(projectId, createBody(v)))} onClose={() => setDialog(null)} />
        )}
      </AppShell>
    );
  }

  const q = quotation;
  const byCategory = groupItems(q.items);
  const shownTotal = estimate?.total ?? Number(q.total);
  const shownStatus = estimate ? budgetStatusOf(estimate.total, q.budget) : q.budget.status;
  const diff = shownTotal - Number(q.budget.max);
  const requestedCount = latest?.status === 'REJECTED' && latest.id === q.id ? q.requestedChanges.length : 0;

  // exactly one primary action per state
  // unsaved swaps would not be sent: save or undo them first
  const primary = draft ? <Button variant="primary" disabled={pickedCount > 0} title={pickedCount > 0 ? t('quotation.saveSwapsFirst') : undefined} onClick={() => setDialog({ kind: 'send' })}>{t('quotation.send')}</Button>
    : homeowner && isLatest && q.status === 'SENT' ? <Button variant="primary" disabled={expired} title={expired ? t('quotation.expired', { date: formatDate(q.validUntil!) }) : undefined} onClick={() => setDialog({ kind: 'approve' })}>{t('quotation.approve')}</Button>
    : canCreate ? <Button variant="primary" onClick={startCreate}>{t('quotation.createRevision', { n: (latest?.revisionNo ?? 0) + 1 })}</Button>
    : null;
  const secondary = (
    <>
      <Button onClick={exportCsv}><Download aria-hidden className="h-4 w-4" />{t('quotation.exportCsv')}</Button>
      {draft && <Button onClick={() => setDialog({ kind: 'terms' })}>{t('quotation.edit')}</Button>}
      {manager && isLatest && q.status === 'SENT' && <Button onClick={() => setDialog({ kind: 'withdraw' })}>{t('quotation.withdraw')}</Button>}
      {homeowner && isLatest && q.status === 'SENT' && <Button onClick={() => setDialog({ kind: 'reject' })}>{t('quotation.requestChanges')}</Button>}
    </>
  );

  return (
    <AppShell wide>
      <PageHeader
        back={back}
        title={<>{t('quotation.title')} · {t('quotation.revision', { n: q.revisionNo })}</>}
        chip={<StatusChip kind="quotation" value={q.status} />}
        description={<>{q.project.code} · {q.project.title}<span className="mx-2 text-slate-300">|</span>{t('quotation.fromDesign', { label: q.designVersion.label || '—' })}</>}
        primary={primary}
        secondary={secondary}
      />

      <div className="mb-5 space-y-3">
        {expired ? <Banner tone="amber">{t('quotation.expired', { date: formatDate(q.validUntil!) })}</Banner>
          : q.status === 'APPROVED' ? <Banner>{t('quotation.approvedBanner')}</Banner>
          : q.status === 'SENT' && !homeowner ? <Banner tone="amber">{t('quotation.sentBanner')}</Banner>
          : q.status === 'DRAFT' ? <Banner tone="amber">{t('quotation.draftBanner')}</Banner>
          : null}
        {actionError && <ErrorState message={actionError} />}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* BOM lines, grouped by category */}
        <Card className="lg:col-span-2" bodyClassName="p-0"
          title={t('quotation.lines', { n: q.items.length })}
          description={<>{q.validUntil ? t('quotation.validUntil', { date: formatDate(q.validUntil) }) : t('quotation.noExpiry')}{q.sentAt && <> · {t('quotation.sentOn', { date: formatDateTime(q.sentAt) })}</>}</>}
          actions={swapMode && pickedCount > 0 ? (
            <>
              <span className="text-xs font-medium text-amber-700">{t('quotation.swapPending', { n: pickedCount })}</span>
              <Button size="sm" onClick={() => setPicked({})}>{t('quotation.undo')}</Button>
              <Button size="sm" variant="primary" loading={saving} onClick={saveSwaps}>{t('quotation.saveSwaps')}</Button>
            </>
          ) : !swapMode && pickedCount > 0 ? <Button size="sm" onClick={() => setPicked({})}>{t('quotation.resetOptions')}</Button> : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-slate-50/70 text-[13px] text-slate-500">
                <tr>
                  <th scope="col" className="w-10 px-4 py-2.5 font-medium">{t('quotation.col.no')}</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">{t('quotation.col.product')}</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">{t('quotation.col.qty')}</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">{t('quotation.col.unitPrice')}</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">{t('quotation.col.lineTotal')}</th>
                </tr>
              </thead>
              {byCategory.map(([category, items]) => (
                <tbody key={category} className="divide-y divide-slate-100 border-b border-line last:border-b-0">
                  <tr className="bg-slate-50/40">
                    <th scope="rowgroup" colSpan={4} className="px-4 py-2 text-[13px] font-semibold text-slate-700">{category}</th>
                    <td className="px-4 py-2 text-right text-[13px] font-semibold tabular-nums text-slate-700">{formatMoney(items.reduce((s, i) => s + Number(i.lineTotal), 0))}</td>
                  </tr>
                  {items.map((item) => {
                    const pick = picked[item.id];
                    // staff swaps on their draft; everyone else tries options while the homeowner still has to decide
                    const canTry = !!item.categoryId && item.elementIds.length > 0 && (swapMode || (isLatest && q.status === 'SENT'));
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3 tabular-nums text-slate-500">{item.lineNo}</td>
                        <td className="px-2 py-3">
                          <p className={`font-medium ${pick ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.productName}</p>
                          <p className="text-xs text-slate-500">{[item.supplierName, item.sku].filter(Boolean).join(' · ')}</p>
                          {pick && (
                            <p className="mt-1 text-xs font-medium text-brand">
                              → {pick.name} · {formatMoney(pick.price)} ({signedMoney((Number(pick.price) - Number(item.unitPrice)) * Number(item.quantity))})
                            </p>
                          )}
                          {canTry && (
                            <button type="button" onClick={() => setDialog({ kind: 'options', item })}
                              className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
                              <Sparkles aria-hidden className="h-3.5 w-3.5" />{t('quotation.tryOptions')}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-slate-700">{Number(item.quantity).toLocaleString('en-US')}</td>
                        <td className="px-2 py-3 text-right tabular-nums text-slate-700">{formatMoney(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatMoney(item.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          {/* totals */}
          <Card title={t('quotation.total')}>
            <DetailList items={[
              { label: t('quotation.subtotal'), value: <span className="tabular-nums">{formatMoney(q.subtotal)}</span> },
              { label: t('quotation.discount'), value: <span className="tabular-nums">{Number(q.discountAmount) ? `−${formatMoney(q.discountAmount)}` : formatMoney(0)}</span> },
            ]} />
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[13px] text-slate-500">{t('quotation.total')}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{formatMoney(q.total)}</p>
              {estimate && (
                <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2">
                  <p className="text-[13px] font-medium text-brand">{t(swapMode ? 'quotation.afterSave' : 'quotation.whatIf')} · {t('quotation.whatIfChanges', { n: pickedCount })}</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{formatMoney(estimate.total)}</p>
                  <p className="text-xs tabular-nums text-slate-600">{signedMoney(estimate.total - Number(q.total))}</p>
                </div>
              )}
            </div>
          </Card>

          {/* budget */}
          <Card title={t('quotation.budget')} actions={<StatusChip kind="budget" value={shownStatus} size="sm" />}>
            <BudgetBar total={shownTotal} min={Number(q.budget.min)} max={Number(q.budget.max)} ceiling={Number(q.budget.ceiling)} />
            <p className="mt-3 text-sm text-slate-700">{t('quotation.budgetRange', { min: formatMoney(q.budget.min), max: formatMoney(q.budget.max) })}</p>
            <p className="text-xs text-slate-500">{t('quotation.tolerance', { p: Number(q.budget.tolerancePercent), ceiling: formatMoney(q.budget.ceiling) })}</p>
            <p className={`mt-2 text-sm font-medium ${diff > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {t(diff > 0 ? 'quotation.overMax' : 'quotation.underMax', { amount: formatMoney(Math.abs(diff)) })}
            </p>
          </Card>

          {/* cost groups */}
          <Card title={t('quotation.groups')}>
            <ul className="space-y-3">
              {q.groups.map((g) => (
                <li key={g.categoryId ?? g.categoryName}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-800">{g.categoryName}</span>
                    <span className="tabular-nums text-slate-900">{formatMoney(g.subtotal)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Number(g.sharePercent))}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{t('quotation.groupLine', { lines: t('quotation.lines', { n: g.lineCount }), share: g.sharePercent })}</p>
                </li>
              ))}
            </ul>
          </Card>

          {q.note && (
            <Card title={t('quotation.noteLabel')}>
              <p className="whitespace-pre-line text-sm text-slate-700">{q.note}</p>
            </Card>
          )}

          {q.status === 'REJECTED' && (
            <Card title={t('quotation.rejected')} description={q.respondedAt && q.respondedBy ? t('quotation.respondedOn', { date: formatDateTime(q.respondedAt), name: q.respondedBy.fullName }) : undefined}>
              {q.rejectionReason && <p className="whitespace-pre-line text-sm text-slate-700">{q.rejectionReason}</p>}
              {q.requestedChanges.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <h3 className="mb-1.5 text-[13px] font-medium text-slate-700">{t('quotation.requestedChanges')}</h3>
                  <ul className="space-y-1 text-[13px] text-slate-700">
                    {q.requestedChanges.map((c) => <li key={c.itemId}>{t('quotation.changeLine', { from: c.currentProductName, to: c.productName, price: formatMoney(c.unitPrice) })}</li>)}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {revisions.length > 1 && (
            <Card title={t('quotation.history')} bodyClassName="p-2">
              <ul>
                {revisions.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => load(r.id)} aria-current={r.id === q.id ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${r.id === q.id ? 'bg-slate-50 font-semibold' : ''}`}>
                      <span>{t('quotation.revision', { n: r.revisionNo })} · <span className="tabular-nums">{formatMoney(r.total)}</span></span>
                      <StatusChip kind="quotation" value={r.status} size="sm" />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* dialogs */}
      {dialog?.kind === 'create' && (
        <TermsDialog title={t('quotation.createTitle')} hint={t('quotation.createHint')} requestedCount={requestedCount}
          submitLabel={t('quotation.createRevision', { n: (latest?.revisionNo ?? 0) + 1 })}
          initial={{ discountAmount: latest?.discountAmount ?? '0', note: q.note ?? '', validUntil: '', applyRequestedChanges: requestedCount > 0 }}
          onSubmit={(v) => act(() => quotationApi.create(projectId, createBody(v)))} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'terms' && (
        <TermsDialog title={t('quotation.editTitle')} submitLabel={t('common.save')}
          initial={{ discountAmount: q.discountAmount, note: q.note ?? '', validUntil: q.validUntil ?? '', applyRequestedChanges: false }}
          // pending swaps are saved together with the terms instead of being dropped by the reload
          onSubmit={(v) => act(() => quotationApi.update(q.id, {
            discountAmount: v.discountAmount, note: v.note || null, validUntil: v.validUntil || null,
            ...(pickedCount ? { replacements: Object.entries(picked).map(([itemId, o]) => ({ itemId, productId: o.id })) } : {}),
          }))}
          onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'send' && (
        <ConfirmDialog title={t('quotation.send')} body={t('quotation.sendConfirm', { name: project.customer.fullName })} confirm={t('quotation.send')}
          onConfirm={() => act(() => quotationApi.send(q.id))} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'withdraw' && (
        <ConfirmDialog title={t('quotation.withdraw')} body={t('quotation.withdrawConfirm')} confirm={t('quotation.withdraw')}
          onConfirm={() => act(() => quotationApi.withdraw(q.id))} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'approve' && (
        <ConfirmDialog title={t('quotation.approve')} confirm={t('quotation.approve')}
          body={<>
            <p>{t('quotation.approveConfirm', { total: formatMoney(q.total) })}</p>
            {pickedCount > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{t('quotation.approveIgnoresTried')}</p>}
          </>}
          onConfirm={() => act(() => quotationApi.approve(q.id))} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'reject' && (
        <RejectDialog triedCount={pickedCount} onClose={() => setDialog(null)}
          onSubmit={(reason, include) => act(() => quotationApi.reject(q.id, reason, include ? Object.entries(picked).map(([itemId, o]) => ({ itemId, productId: o.id })) : []))} />
      )}
      {dialog?.kind === 'options' && (
        <OptionsDialog item={dialog.item} picked={picked[dialog.item.id]} mode={swapMode ? 'swap' : 'try'} onClose={() => setDialog(null)}
          onPick={(o) => setPicked((x) => {
            const next = { ...x };
            if (o) next[dialog.item.id] = o; else delete next[dialog.item.id];
            return next;
          })} />
      )}
    </AppShell>
  );
}

function createBody(v: TermsValue) {
  return {
    discountAmount: v.discountAmount,
    ...(v.note ? { note: v.note } : {}),
    ...(v.validUntil ? { validUntil: v.validUntil } : {}),
    applyRequestedChanges: v.applyRequestedChanges,
  };
}

/** Lines in category order (the backend already sorts them by category, then product). */
function groupItems(items: QuotationItem[]): [string, QuotationItem[]][] {
  const groups = new Map<string, QuotationItem[]>();
  for (const item of items) groups.set(item.categoryName, [...(groups.get(item.categoryName) ?? []), item]);
  return [...groups.entries()];
}

/** Horizontal scale from 0 to a bit past the tolerance ceiling: budget band, tolerance band and the total's marker. */
function BudgetBar({ total, min, max, ceiling }: { total: number; min: number; max: number; ceiling: number }) {
  const end = Math.max(ceiling, total) * 1.08 || 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / end) * 100))}%`;
  const color = total < min ? 'bg-sky-500' : total <= max ? 'bg-emerald-600' : total <= ceiling ? 'bg-amber-500' : 'bg-rose-600';
  return (
    <div aria-hidden className="relative h-3 rounded-full bg-slate-100">
      <div className="absolute inset-y-0 rounded-full bg-emerald-100" style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
      <div className="absolute inset-y-0 bg-amber-100" style={{ left: pct(max), width: `calc(${pct(ceiling)} - ${pct(max)})` }} />
      <div className={`absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full ${color}`} style={{ left: pct(total) }} />
    </div>
  );
}

export default QuotationPage;
