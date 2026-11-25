import { useEffect, useRef, useState } from 'react';
import { AppShell, Button, DataTable, EmptyState, ErrorState, PageHeader, Select, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, formatMoney, t } from '@/i18n';
import { getProjects } from '@/features/projects/projectApi';
import { ApiError, getCurrentUser } from '@/services/authService';
import { paymentService } from '@/services/paymentService';
import { PAYMENT_HISTORY_DEFAULT_LIMIT, PAYMENT_TRANSACTION_STATUSES, clampedPage, totalPages } from './paymentHistoryQuery';
import type { PaymentTransactionHistoryItem, PaymentTransactionHistoryPage, PaymentTransactionStatus } from './paymentHistoryQuery';

const LIMIT = PAYMENT_HISTORY_DEFAULT_LIMIT;
const dash = t('common.none');

type LoadError = { kind: 'forbidden' } | { kind: 'error'; message: string };

function toLoadError(error: unknown): LoadError {
  if (error instanceof ApiError) {
    if (error.status === 403) return { kind: 'forbidden' };
    // 400 means the FE built a bad query: log it for us, show the user a generic message.
    if (error.status === 400) {
      console.error('[GET /payment-transactions] VALIDATION_ERROR', error.details);
      return { kind: 'error', message: t('paymentHistory.loadError') };
    }
    return { kind: 'error', message: error.message || t('paymentHistory.loadError') };
  }
  return { kind: 'error', message: t('paymentHistory.loadError') };
}

/** GET /payment-transactions: homeowner, staff and admin. Scoping by role is done by the backend. */
export function PaymentHistoryPage() {
  const role = getCurrentUser()?.role;
  const canFilterProject = role === 'staff' || role === 'admin';

  const [status, setStatus] = useState<PaymentTransactionStatus | ''>('');
  const [projectId, setProjectId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaymentTransactionHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkError, setCheckError] = useState('');
  const [projects, setProjects] = useState<{ id: string; code: string; title: string }[]>([]);
  /** Bumped to refetch with the same filters (retry, after "Check again"). */
  const [reloadKey, setReloadKey] = useState(0);
  /** Row whose "Check again" is waiting for the list refetch, to tell if it is still PENDING. */
  const recheckedRef = useRef<string | null>(null);
  /** Inline note under one row's status, e.g. "still pending". */
  const [rowNotice, setRowNotice] = useState<{ id: string; message: string } | null>(null);

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);
    paymentService.listTransactions({ page, limit: LIMIT, status, projectId })
      .then((result) => {
        if (ignore) return;
        // Only with a real response and total > 0: past the last page → jump to it. The new page is
        // strictly smaller and >= 1, so this re-runs the effect at most a few times and cannot loop.
        const last = clampedPage(page, result.total, LIMIT);
        if (last !== null && last < page) { setPage(last); return; }
        setData(result);
        setLoading(false);
        const checked = recheckedRef.current;
        if (checked) {
          recheckedRef.current = null;
          setCheckingId(null);
          // GET /payment-transactions/:id answers 200 even when PayOS reconciliation fails, so read the refetched row.
          if (result.items.some((r) => r.id === checked && r.status === 'PENDING')) {
            setRowNotice({ id: checked, message: t('paymentHistory.stillPending') });
          }
        }
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(toLoadError(e));
        setLoading(false);
        if (recheckedRef.current) { recheckedRef.current = null; setCheckingId(null); }
      });
    return () => { ignore = true; };
  }, [page, status, projectId, reloadKey]);

  useEffect(() => {
    if (!canFilterProject) return;
    let alive = true;
    getProjects({ limit: 100 })
      .then((res) => { if (alive) setProjects(res.items.map(({ id, code, title }) => ({ id, code, title }))); })
      .catch(() => { /* the filter is optional; the list still works without it */ });
    return () => { alive = false; };
  }, [canFilterProject]);

  const goToPage = (next: number) => { setRowNotice(null); setPage(next); };
  const changeStatus = (value: string) => { setStatus(value as PaymentTransactionStatus | ''); goToPage(1); };
  const changeProject = (value: string) => { setProjectId(value); goToPage(1); };

  /**
   * GET /payment-transactions/:id reconciles with PayOS, then the list is refetched once (no polling).
   * The button stays disabled with a spinner until that refetch lands (see the effect above).
   */
  const recheck = async (id: string) => {
    if (checkingId) return;
    setCheckingId(id);
    setCheckError('');
    setRowNotice(null);
    try {
      await paymentService.getTransaction(id);
    } catch (e) {
      setCheckingId(null);
      if (e instanceof ApiError && (e.code === 'PAYMENT_TRANSACTION_NOT_FOUND' || e.status === 404)) {
        setCheckError(t('paymentHistory.notFound'));
        reload();
      } else {
        setCheckError(e instanceof ApiError && e.message ? e.message : t('paymentHistory.recheckError'));
      }
      return;
    }
    recheckedRef.current = id;
    reload();
  };

  const columns: Column<PaymentTransactionHistoryItem>[] = [
    {
      key: 'time', header: t('paymentHistory.colTime'), className: 'whitespace-nowrap',
      cell: (r) => <span className="text-slate-700">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'project', header: t('paymentHistory.colProject'),
      cell: (r) => r.project
        ? <span className="block min-w-0"><span className="font-mono text-xs text-slate-500">{r.project.code}</span> <span className="font-medium text-slate-900">{r.project.title}</span></span>
        : dash,
    },
    { key: 'contract', header: t('paymentHistory.colContract'), hideOnMobile: true, cell: (r) => r.contract?.contractNo ?? dash },
    {
      key: 'milestone', header: t('paymentHistory.colMilestone'),
      cell: (r) => (
        <span>
          {t('paymentHistory.milestone', { seq: r.milestone.seqNo, name: r.milestone.name })}
          {r.type === 'REFUND' && <span className="ml-1.5"><StatusChip size="sm" tone="violet" label={t('paymentHistory.refund')} /></span>}
        </span>
      ),
    },
    { key: 'payer', header: t('paymentHistory.colPayer'), hideOnMobile: true, cell: (r) => r.payer?.fullName ?? dash },
    {
      key: 'amount', header: t('paymentHistory.colAmount'), className: 'whitespace-nowrap text-right',
      cell: (r) => <span className="font-semibold tabular-nums">{formatMoney(Number(r.amount))}</span>,
    },
    { key: 'gateway', header: t('paymentHistory.colGateway'), hideOnMobile: true, cell: (r) => t(`paymentHistory.gateway.${r.gateway}`) },
    {
      key: 'status', header: t('paymentHistory.colStatus'),
      cell: (r) => (
        <span className="inline-flex flex-col items-end gap-1 sm:items-start">
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusChip kind="paymentTxn" value={r.status} />
            {r.status === 'PENDING' && (
              <Button size="sm" variant="ghost" disabled={checkingId !== null} loading={checkingId === r.id} onClick={() => void recheck(r.id)}>
                {checkingId === r.id ? t('paymentHistory.rechecking') : t('paymentHistory.recheck')}
              </Button>
            )}
          </span>
          {rowNotice?.id === r.id && <span role="status" className="text-xs text-amber-700">{rowNotice.message}</span>}
        </span>
      ),
    },
    {
      key: 'completed', header: t('paymentHistory.colCompleted'), hideOnMobile: true, className: 'whitespace-nowrap',
      cell: (r) => (r.completedAt ? formatDateTime(r.completedAt) : dash),
    },
  ];

  const total = data?.total ?? 0;
  const pages = totalPages(total, LIMIT);
  const filtered = Boolean(status || projectId);
  const hasPending = data?.items.some((r) => r.status === 'PENDING') ?? false;

  if (error?.kind === 'forbidden') {
    return (
      <AppShell wide>
        <PageHeader title={t('paymentHistory.title')} />
        <EmptyState title={t('paymentHistory.forbidden')} />
      </AppShell>
    );
  }

  return (
    <AppShell wide>
      <PageHeader title={t('paymentHistory.title')} description={t('paymentHistory.description')} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-slate-700">
          {t('paymentHistory.filterStatus')}
          <Select value={status} onChange={(e) => changeStatus(e.target.value)} className="w-48">
            <option value="">{t('paymentHistory.allStatuses')}</option>
            {PAYMENT_TRANSACTION_STATUSES.map((s) => <option key={s} value={s}>{t(`status.paymentTxn.${s}`)}</option>)}
          </Select>
        </label>
        {canFilterProject && (
          <label className="flex min-w-0 flex-col gap-1.5 text-[13px] font-medium text-slate-700">
            {t('paymentHistory.filterProject')}
            <Select value={projectId} onChange={(e) => changeProject(e.target.value)} className="w-72 max-w-full">
              <option value="">{t('paymentHistory.allProjects')}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{`${p.code} – ${p.title}`}</option>)}
            </Select>
          </label>
        )}
        {data && !error && <span className="ml-auto pb-2 text-[13px] text-slate-500">{t('paymentHistory.total', { n: total })}</span>}
      </div>

      {hasPending && !error && <p className="mb-3 text-[13px] text-slate-500">{t('paymentHistory.pendingHint')}</p>}
      {checkError && <div className="mb-3"><ErrorState message={checkError} onDismiss={() => setCheckError('')} /></div>}

      <DataTable
        columns={columns}
        rows={loading && !data ? null : data?.items ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error?.kind === 'error' ? error.message : undefined}
        onRetry={reload}
        empty={filtered ? t('paymentHistory.emptyFiltered') : t('paymentHistory.empty')}
        pageSize={LIMIT}
      />

      {pages > 1 && !error && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[13px] text-slate-500">
          <span>{t('common.page', { page, pages })}</span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" aria-label={t('common.prev')} disabled={loading || page <= 1} onClick={() => goToPage(page - 1)}>‹</Button>
            <Button size="sm" variant="ghost" aria-label={t('common.next')} disabled={loading || page >= pages} onClick={() => goToPage(page + 1)}>›</Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default PaymentHistoryPage;
