import { useEffect, useRef, useState } from 'react';
import { Button, DataTable, ErrorState, Select, StatusChip } from '@/components/ui';
import type { Column } from '@/components/ui';
import { formatDateTime, formatMoney, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { paymentService } from '@/services/paymentService';
import { PAYMENT_TRANSACTION_STATUSES, contractPaymentTransactionsPath } from './paymentHistoryQuery';
import type { ContractPaymentTransactions, PaymentTransactionHistoryItem, PaymentTransactionStatus } from './paymentHistoryQuery';

const dash = t('common.none');
/** No paging on this API: one page big enough that DataTable never splits it. */
const ALL_ROWS = 10_000;

function sectionError(error: unknown): string {
  if (error instanceof ApiError) {
    // 400 BAD_REQUEST (bad :id) / VALIDATION_ERROR (bad status, unknown key) are FE bugs.
    if (error.status === 400) {
      console.error(`[GET /contracts/:id/payment-transactions] ${error.code}`, error.details);
      return t('paymentHistory.loadError');
    }
    // 404 CONTRACT_NOT_FOUND (not mine / not sent to the customer yet); 403 should not happen.
    if (error.status === 404 || error.status === 403) return t('paymentHistory.contractUnavailable');
    return error.message || t('paymentHistory.loadError');
  }
  return t('paymentHistory.loadError');
}

/**
 * "Transaction history" section of the contract detail page (GET /contracts/:id/payment-transactions).
 * Errors stay inside the section. Do not render for DESIGNER (403).
 * `onChanged` runs after "Check again" so the page can refresh milestone statuses too.
 */
export function ContractPaymentHistory({ contractId, onChanged }: { contractId: string; onChanged?: () => void }) {
  const [status, setStatus] = useState<PaymentTransactionStatus | ''>('');
  const [data, setData] = useState<ContractPaymentTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkError, setCheckError] = useState('');
  const [rowNotice, setRowNotice] = useState<{ id: string; message: string } | null>(null);
  const recheckedRef = useRef<string | null>(null);
  const onChangedRef = useRef(onChanged);
  useEffect(() => { onChangedRef.current = onChanged; });

  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    // No contract UUID yet → no request (never /contracts/undefined/...).
    if (!contractPaymentTransactionsPath(contractId, status)) return;
    let ignore = false;
    setLoading(true);
    setError('');
    paymentService.listContractTransactions(contractId, status)
      .then((result) => {
        if (ignore) return;
        setData(result);
        setLoading(false);
        const checked = recheckedRef.current;
        if (checked) {
          recheckedRef.current = null;
          setCheckingId(null);
          // GET /payment-transactions/:id answers 200 even when PayOS reconciliation fails: read the refetched row.
          if (result.items.some((r) => r.id === checked && r.status === 'PENDING')) {
            setRowNotice({ id: checked, message: t('paymentHistory.stillPending') });
          }
        }
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(sectionError(e));
        setLoading(false);
        if (recheckedRef.current) { recheckedRef.current = null; setCheckingId(null); }
      });
    return () => { ignore = true; };
  }, [contractId, status, reloadKey]);

  const changeStatus = (value: string) => { setRowNotice(null); setStatus(value as PaymentTransactionStatus | ''); };

  /** Same flow as the history page: reconcile one row, then refetch this section (and the page's milestones). */
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
    onChangedRef.current?.();
  };

  const columns: Column<PaymentTransactionHistoryItem>[] = [
    { key: 'time', header: t('paymentHistory.colTime'), className: 'whitespace-nowrap', cell: (r) => formatDateTime(r.createdAt) },
    {
      key: 'milestone', header: t('paymentHistory.colMilestone'),
      cell: (r) => (
        <span>
          {t('paymentHistory.contractMilestone', { seq: r.milestone.seqNo, name: r.milestone.name })}
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

  return (
    <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900">{t('paymentHistory.contractTitle')}</h2>
        <label className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
          {t('paymentHistory.filterStatus')}
          <Select value={status} onChange={(e) => changeStatus(e.target.value)} className="w-44">
            <option value="">{t('paymentHistory.allStatuses')}</option>
            {PAYMENT_TRANSACTION_STATUSES.map((s) => <option key={s} value={s}>{t(`status.paymentTxn.${s}`)}</option>)}
          </Select>
        </label>
      </div>

      {checkError && <div className="mb-3"><ErrorState message={checkError} onDismiss={() => setCheckError('')} /></div>}

      <DataTable
        columns={columns}
        rows={loading && !data ? null : data?.items ?? []}
        rowKey={(r) => r.id}
        loading={loading}
        error={error || undefined}
        onRetry={reload}
        empty={status ? t('paymentHistory.emptyFiltered') : t('paymentHistory.empty')}
        pageSize={ALL_ROWS}
      />
    </section>
  );
}

export default ContractPaymentHistory;
