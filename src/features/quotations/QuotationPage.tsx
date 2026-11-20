import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, Sparkles } from 'lucide-react';
import { AppShell, Banner, Button, Card, DetailList, EmptyState, ErrorState, PageHeader, Skeleton, StatusChip } from '@/components/ui';
import { errorText, formatDate, formatMoney, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { projectApi } from '@/features/projects/projectApi';
import type { Project } from '@/features/projects/projectApi';
import { designApi } from '@/features/design-workspace/designApi';
import { budgetStatusOf, COST_GROUPS, estimateWith, quotationApi, signedMoney, todayVn } from './quotationApi';
import type { CostCategory, ProductOption, Quotation, QuotationFileFormat, QuotationItem, QuotationSummary } from './quotationApi';
import { ConfirmDialog, OptionsDialog, RequestChangesDialog, ValidUntilDialog } from './QuotationDialogs';

type Dialog =
  | { kind: 'validUntil' } | { kind: 'send' } | { kind: 'accept' } | { kind: 'requestChanges' }
  | { kind: 'options'; item: QuotationItem; elementId: string };

/** What the page needs from the approved design version: its label and the design items per product (for "Try options"). */
interface VersionInfo { label: string; elementsByProduct: Map<string, string[]> }

const projectHome = (role: string, id: string) =>
  role === 'homeowner' ? `/homeowner/projects/${id}` : role === 'designer' ? `/designer/projects/${id}` : `/staff/projects/${id}`;

/**
 * Quotation / BOM of a project (/projects/:projectId/quotation): lines grouped by cost group, design fee, comparison
 * with the budget, "Try options" per line (estimate only), revisions. The backend creates the draft when the homeowner
 * approves the products; staff in charge (or admin) sets the expiry and sends it; the homeowner accepts it or asks for
 * changes. Lead / members and other staff only read and download.
 */
export function QuotationPage() {
  const { projectId = '' } = useParams();
  const user = getCurrentUser();
  const role = user?.role ?? 'homeowner';
  const [project, setProject] = useState<Project | null>(null);
  const [revisions, setRevisions] = useState<QuotationSummary[] | null>(null);
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<Dialog | null>(null);
  /** What-if product per line (homeowner and team trying options); never saved. */
  const [picked, setPicked] = useState<Record<string, ProductOption>>({});

  const load = useCallback(async (id?: string | null) => {
    setError('');
    try {
      const [p, list] = await Promise.all([projectApi.get(projectId), quotationApi.list(projectId)]);
      const target = id && list.some((q) => q.id === id) ? id : list[0]?.id ?? null;
      const q = target ? await quotationApi.get(target) : null;
      setProject(p);
      setRevisions(list);
      setSelectedId(target);
      setQuotation(q);
      setPicked({});
      setVersion(null);
      if (q) loadVersion(q.designVersionId).then(setVersion);
    } catch (e) { setError(errorText(e)); }
  }, [projectId, setPicked]);
  useEffect(() => { Promise.resolve().then(() => load()); }, [load]);

  const homeowner = role === 'homeowner';
  const manager = !!project && (role === 'admin' || (role === 'staff' && project.staff.id === user?.id));
  const latest = revisions?.[0] ?? null;
  const isLatest = !!quotation && quotation.id === latest?.id;
  const draft = manager && isLatest && quotation?.status === 'DRAFT';
  const open = isLatest && quotation?.status === 'SENT';
  const expired = open && !!quotation?.validUntil && quotation.validUntil < todayVn();
  const pickedCount = Object.keys(picked).length;
  const estimate = useMemo(() => (quotation && pickedCount ? estimateWith(quotation, picked) : null), [quotation, picked, pickedCount]);

  /** Runs an action that returns the updated quotation, then refreshes the revision list. */
  const act = async (fn: () => Promise<Quotation>) => {
    setActionError('');
    const q = await fn();
    await load(q.id);
  };

  const download = async (format: QuotationFileFormat) => {
    if (!quotation || !project) return;
    setActionError('');
    try { await quotationApi.download(quotation, project.code, format); } catch (e) { setActionError(errorText(e)); }
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

  // ----- no quotation yet (the backend creates it when the homeowner approves the products) -----
  if (!quotation) {
    const message = project.status !== 'QUOTING' ? t('quotation.empty.notQuoting')
      : homeowner ? t('quotation.empty.waitingStaff') : t('quotation.empty.waitingTeam');
    return (
      <AppShell wide>
        <PageHeader back={back} title={t('quotation.title')} description={`${project.code} · ${project.title}`} />
        <EmptyState title={message} />
      </AppShell>
    );
  }

  const q = quotation;
  const byGroup = groupItems(q.items);
  const shownTotal = estimate?.total ?? Number(q.totalAmount);
  const shownStatus = budgetStatusOf(shownTotal, q.budget);
  const overMax = shownTotal - Number(q.budget.max);
  const overLimit = shownTotal - Number(q.budget.limit);
  // anyone may try options while the latest quotation waits for the homeowner; older revisions are read-only
  const canTry = open;
  const triedLines = q.items.filter((i) => picked[i.id]).map((i) =>
    t('quotation.changeLine', { from: i.productName, to: picked[i.id].name, price: formatMoney(picked[i.id].price) }));
  const groupTotal = Number(q.totalAmount) || 1;

  // exactly one primary action per state
  const primary = draft ? <Button variant="primary" onClick={() => setDialog({ kind: 'send' })}>{t('quotation.send')}</Button>
    : homeowner && open ? <Button variant="primary" disabled={expired} title={expired ? t('quotation.expired', { date: formatDate(q.validUntil!) }) : undefined} onClick={() => setDialog({ kind: 'accept' })}>{t('quotation.accept')}</Button>
    : null;
  const secondary = (
    <>
      <Button onClick={() => download('csv')}><Download aria-hidden className="h-4 w-4" />{t('quotation.downloadCsv')}</Button>
      <Button onClick={() => download('pdf')}><Download aria-hidden className="h-4 w-4" />{t('quotation.downloadPdf')}</Button>
      {draft && <Button onClick={() => setDialog({ kind: 'validUntil' })}>{t('quotation.editValidUntil')}</Button>}
      {homeowner && open && !expired && <Button onClick={() => setDialog({ kind: 'requestChanges' })}>{t('quotation.requestChanges')}</Button>}
    </>
  );

  const workspaceLink = <Link to={`/projects/${projectId}/workspace`} className="font-semibold underline">{t('quotation.openWorkspace')}</Link>;
  const banner = !isLatest ? <Banner>{t('quotation.oldRevision', { n: latest?.revisionNo ?? q.revisionNo })}</Banner>
    : expired || q.status === 'EXPIRED' ? <Banner tone="amber">{q.validUntil ? t('quotation.expired', { date: formatDate(q.validUntil) }) : t('quotation.expiredNoDate')}</Banner>
    : q.status === 'ACCEPTED' ? <Banner>{t('quotation.acceptedBanner')}</Banner>
    : q.status === 'CHANGES_REQUESTED' ? <Banner tone="amber">{homeowner ? t('quotation.changesRequestedHomeowner') : <>{t('quotation.changesRequestedTeam')} {workspaceLink}</>}</Banner>
    : q.status === 'SENT' && !homeowner ? <Banner tone="amber">{t('quotation.sentBanner')}</Banner>
    : q.status === 'DRAFT' ? <Banner tone="amber">{t('quotation.draftBanner')}</Banner>
    : null;

  const lineNo = new Map(byGroup.flatMap(([, items]) => items).map((item, i) => [item.id, i + 1]));
  return (
    <AppShell wide>
      <PageHeader
        back={back}
        title={<>{t('quotation.title')} {q.quotationNo} · {t('quotation.revision', { n: q.revisionNo })}</>}
        chip={<StatusChip kind="quotation" value={expired ? 'EXPIRED' : q.status} />}
        description={<>{project.code} · {project.title}<span className="mx-2 text-slate-300">|</span>{t('quotation.fromDesign', { label: version?.label || '—' })}</>}
        primary={primary}
        secondary={secondary}
      />

      <div className="mb-5 space-y-3">
        {banner}
        {actionError && <ErrorState message={actionError} />}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* BOM lines, grouped by cost group */}
        <Card className="lg:col-span-2" bodyClassName="p-0"
          title={t('quotation.lines', { n: q.items.length })}
          description={q.validUntil ? t('quotation.validUntil', { date: formatDate(q.validUntil) }) : t('quotation.noExpiry')}
          actions={pickedCount > 0 ? <Button size="sm" onClick={() => setPicked({})}>{t('quotation.resetOptions')}</Button> : undefined}>
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
              {byGroup.map(([group, items]) => (
                <tbody key={group} className="divide-y divide-slate-100 border-b border-line last:border-b-0">
                  <tr className="bg-slate-50/40">
                    <th scope="rowgroup" colSpan={4} className="px-4 py-2 text-[13px] font-semibold text-slate-700">{t(`quotation.group.${group}`)}</th>
                    <td className="px-4 py-2 text-right text-[13px] font-semibold tabular-nums text-slate-700">{formatMoney(q.costBreakdown[group] ?? items.reduce((s, i) => s + Number(i.lineTotal), 0))}</td>
                  </tr>
                  {items.map((item) => {
                    const pick = picked[item.id];
                    const elementId = version?.elementsByProduct.get(item.productId)?.[0];
                    return (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3 tabular-nums text-slate-500">{lineNo.get(item.id)}</td>
                        <td className="px-2 py-3">
                          <p className={`font-medium ${pick ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.productName}</p>
                          {item.supplierName && <p className="text-xs text-slate-500">{item.supplierName}</p>}
                          {pick && (
                            <p className="mt-1 text-xs font-medium text-brand">
                              → {pick.name} · {formatMoney(pick.price)} ({signedMoney((Number(pick.price) - Number(item.unitPrice)) * Number(item.quantity))})
                            </p>
                          )}
                          {canTry && elementId && (
                            <button type="button" onClick={() => setDialog({ kind: 'options', item, elementId })}
                              className="mt-1 inline-flex items-center gap-1 rounded text-xs font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand">
                              <Sparkles aria-hidden className="h-3.5 w-3.5" />{t('quotation.tryOptions')}
                            </button>
                          )}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-slate-700">
                          {Number(item.quantity).toLocaleString('en-US')} <span className="text-xs text-slate-500">{t(`quotation.unit.${item.unit}`)}</span>
                        </td>
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
              { label: t('quotation.productsSubtotal'), value: <span className="tabular-nums">{formatMoney(q.productsSubtotal)}</span> },
              { label: t('quotation.designFee'), value: <span className="tabular-nums">{formatMoney(q.designFee)}</span> },
            ]} />
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-[13px] text-slate-500">{t('quotation.total')}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{formatMoney(q.totalAmount)}</p>
              {estimate && (
                <div className="mt-3 rounded-lg bg-brand-soft px-3 py-2">
                  <p className="text-[13px] font-medium text-brand">{t('quotation.whatIf')} · {t('quotation.whatIfChanges', { n: pickedCount })}</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{formatMoney(estimate.total)}</p>
                  <p className="text-xs tabular-nums text-slate-600">{signedMoney(estimate.total - Number(q.totalAmount))}</p>
                  <p className="mt-1 text-xs text-slate-600">{t('quotation.whatIfNotSaved')}</p>
                </div>
              )}
            </div>
          </Card>

          {/* budget */}
          <Card title={t('quotation.budget')} actions={<StatusChip kind="budget" value={shownStatus} size="sm" />}>
            <BudgetBar total={shownTotal} min={Number(q.budget.min)} max={Number(q.budget.max)} limit={Number(q.budget.limit)} />
            <p className="mt-3 text-sm text-slate-700">{t('quotation.budgetRange', { min: formatMoney(q.budget.min), max: formatMoney(q.budget.max) })}</p>
            <p className="text-xs text-slate-500">{t('quotation.tolerance', { p: Number(q.budget.tolerancePercent), limit: formatMoney(q.budget.limit) })}</p>
            <p className={`mt-2 text-sm font-medium ${overMax > 0 ? (overLimit > 0 ? 'text-rose-700' : 'text-amber-700') : 'text-emerald-700'}`}>
              {t(overMax > 0 ? 'quotation.overMax' : 'quotation.underMax', { amount: formatMoney(Math.abs(overMax)) })}
            </p>
            {overLimit > 0 && <p className="text-sm font-medium text-rose-700">{t('quotation.overLimit', { amount: formatMoney(overLimit) })}</p>}
            {estimate && <p className="mt-1 text-xs text-slate-500">{t('quotation.budgetUsesEstimate')}</p>}
          </Card>

          {/* cost groups */}
          <Card title={t('quotation.groups')}>
            <ul className="space-y-3">
              {COST_GROUPS.filter((g) => g === 'DESIGN_FEE' || Number(q.costBreakdown[g] ?? 0) > 0).map((g) => {
                const amount = Number(q.costBreakdown[g] ?? 0);
                const share = Math.round((amount / groupTotal) * 1000) / 10;
                return (
                  <li key={g}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-slate-800">{t(`quotation.group.${g}`)}</span>
                      <span className="tabular-nums text-slate-900">{formatMoney(amount)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{t('quotation.groupShare', { share })}</p>
                  </li>
                );
              })}
            </ul>
          </Card>

          {revisions.length > 1 && (
            <Card title={t('quotation.history')} bodyClassName="p-2">
              <ul>
                {revisions.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => load(r.id)} aria-current={r.id === q.id ? 'true' : undefined}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${r.id === q.id ? 'bg-slate-50 font-semibold' : ''}`}>
                      <span>{t('quotation.revision', { n: r.revisionNo })} · <span className="tabular-nums">{formatMoney(r.totalAmount)}</span></span>
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
      {dialog?.kind === 'validUntil' && (
        <ValidUntilDialog initial={q.validUntil} onClose={() => setDialog(null)}
          onSubmit={(v) => act(() => quotationApi.updateValidUntil(q.id, v))} />
      )}
      {dialog?.kind === 'send' && (
        <ConfirmDialog title={t('quotation.send')} confirm={t('quotation.send')} onClose={() => setDialog(null)}
          body={<>
            <p>{t('quotation.sendConfirm', { name: project.customer.fullName })}</p>
            <p className="text-slate-500">{q.validUntil ? t('quotation.validUntil', { date: formatDate(q.validUntil) }) : t('quotation.sendDefaultExpiry')}</p>
          </>}
          onConfirm={() => act(() => quotationApi.send(q.id))} />
      )}
      {dialog?.kind === 'accept' && (
        <ConfirmDialog title={t('quotation.accept')} confirm={t('quotation.accept')} onClose={() => setDialog(null)}
          body={<>
            <p>{t('quotation.acceptConfirm', { total: formatMoney(q.totalAmount) })}</p>
            {pickedCount > 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{t('quotation.acceptIgnoresTried')}</p>}
          </>}
          onConfirm={() => act(() => quotationApi.accept(q.id))} />
      )}
      {dialog?.kind === 'requestChanges' && (
        <RequestChangesDialog triedLines={triedLines} onClose={() => setDialog(null)}
          onSubmit={(reason) => act(() => quotationApi.requestChanges(q.id, reason))} />
      )}
      {dialog?.kind === 'options' && (
        <OptionsDialog item={dialog.item} elementId={dialog.elementId} picked={picked[dialog.item.id]} onClose={() => setDialog(null)}
          onPick={(o) => setPicked((x) => {
            const next = { ...x };
            if (o) next[dialog.item.id] = o; else delete next[dialog.item.id];
            return next;
          })} />
      )}
    </AppShell>
  );
}

/**
 * Label of the approved version and its design items per product. Quotation lines don't carry the design item yet, so
 * "Try options" matches lines to items by product (same product → same category, so the same options). Failing to load
 * only hides "Try options".
 */
async function loadVersion(versionId: string): Promise<VersionInfo> {
  try {
    const v = await designApi.getVersion(versionId);
    const elementsByProduct = new Map<string, string[]>();
    for (const e of v.elements) {
      if (e.product) elementsByProduct.set(e.product.id, [...(elementsByProduct.get(e.product.id) ?? []), e.id]);
    }
    return { label: v.label, elementsByProduct };
  } catch {
    return { label: '', elementsByProduct: new Map() };
  }
}

/** Lines in cost-group order (the backend sorts them by group, then name). */
function groupItems(items: QuotationItem[]): [CostCategory, QuotationItem[]][] {
  const groups = new Map<CostCategory, QuotationItem[]>();
  for (const item of items) groups.set(item.costCategory, [...(groups.get(item.costCategory) ?? []), item]);
  return COST_GROUPS.flatMap((g) => (g !== 'DESIGN_FEE' && groups.has(g) ? [[g, groups.get(g)!] as [CostCategory, QuotationItem[]]] : []));
}

/** Horizontal scale from 0 to a bit past the budget limit: budget band, tolerance band and the total's marker. */
function BudgetBar({ total, min, max, limit }: { total: number; min: number; max: number; limit: number }) {
  const end = Math.max(limit, total) * 1.08 || 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / end) * 100))}%`;
  const color = total < min ? 'bg-sky-500' : total <= max ? 'bg-emerald-600' : total <= limit ? 'bg-amber-500' : 'bg-rose-600';
  return (
    <div aria-hidden className="relative h-3 rounded-full bg-slate-100">
      <div className="absolute inset-y-0 rounded-full bg-emerald-100" style={{ left: pct(min), width: `calc(${pct(max)} - ${pct(min)})` }} />
      <div className="absolute inset-y-0 bg-amber-100" style={{ left: pct(max), width: `calc(${pct(limit)} - ${pct(max)})` }} />
      <div className={`absolute -top-1 h-5 w-1.5 -translate-x-1/2 rounded-full ${color}`} style={{ left: pct(total) }} />
    </div>
  );
}

export default QuotationPage;
