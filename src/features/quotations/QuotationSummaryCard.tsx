import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt } from 'lucide-react';
import { Button, ErrorState, Skeleton, StatusChip } from '@/components/ui';
import { errorText, formatMoney, t } from '@/i18n';
import { budgetStatusFromFlag, quotationApi, todayVn } from './quotationApi';
import type { QuotationSummary } from './quotationApi';

/**
 * Latest quotation the viewer may see, on the project overview (the homeowner never gets drafts). Highlighted when it
 * waits for the homeowner's answer. After a change request it says Lead is updating the products.
 */
export function QuotationSummaryCard({ projectId, homeowner, onlyAfterChangeRequest = false }: {
  projectId: string; homeowner: boolean;
  /** Render nothing unless the latest quotation is CHANGES_REQUESTED (product selection stage). */
  onlyAfterChangeRequest?: boolean;
}) {
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<QuotationSummary | null | undefined>(undefined);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setQuotation((await quotationApi.list(projectId))[0] ?? null); } catch (e) { setError(errorText(e)); }
  }, [projectId]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const open = () => navigate(`/projects/${projectId}/quotation`);
  if (onlyAfterChangeRequest && quotation?.status !== 'CHANGES_REQUESTED') return null;
  if (error) return <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>;
  if (quotation === undefined) return <Skeleton className="mb-5 h-24 w-full rounded-card" />;

  const expired = quotation?.status === 'SENT' && !!quotation.validUntil && quotation.validUntil < todayVn();
  const waiting = homeowner && quotation?.status === 'SENT' && !expired;
  const changing = quotation?.status === 'CHANGES_REQUESTED';
  return (
    <section aria-labelledby="quotation-summary"
      className={`mb-5 flex flex-col gap-4 rounded-card border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6 ${waiting ? 'border-blue-100 bg-brand-soft' : 'border-line bg-surface'}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><Receipt className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="quotation-summary" className="text-[15px] font-semibold text-slate-900">{t('quotation.title')}</h2>
            {quotation && <StatusChip kind="quotation" value={expired ? 'EXPIRED' : quotation.status} size="sm" />}
          </div>
          {quotation ? (
            <>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(quotation.totalAmount)}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {quotation.quotationNo} · {t('quotation.revision', { n: quotation.revisionNo })}
                <StatusChip kind="budget" value={budgetStatusFromFlag(quotation.withinBudget)} size="sm" />
              </p>
              {changing && <p className="mt-1 text-sm text-slate-600">{t(homeowner ? 'quotation.changesRequestedHomeowner' : 'quotation.changesRequestedTeam')}</p>}
            </>
          ) : <p className="mt-1 text-sm text-slate-600">{t(homeowner ? 'quotation.empty.waitingStaff' : 'quotation.empty.waitingTeam')}</p>}
        </div>
      </div>
      {(quotation || !homeowner) && (
        <Button variant={waiting ? 'primary' : 'secondary'} onClick={open} className="self-start sm:self-auto">
          {t('projectDetail.openQuotation')}<ArrowRight aria-hidden className="h-4 w-4" />
        </Button>
      )}
    </section>
  );
}

export default QuotationSummaryCard;
