import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Receipt } from 'lucide-react';
import { Button, ErrorState, Skeleton, StatusChip } from '@/components/ui';
import { errorText, formatMoney, t } from '@/i18n';
import { quotationApi } from './quotationApi';
import type { Quotation } from './quotationApi';

/**
 * Latest quotation the viewer may see, on the project overview (quotation stage and after). Highlighted when it
 * waits for the homeowner's answer; a quiet line while staff is still preparing it.
 */
export function QuotationSummaryCard({ projectId, homeowner }: { projectId: string; homeowner: boolean }) {
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<Quotation | null | undefined>(undefined);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try { setQuotation(await quotationApi.current(projectId)); } catch (e) {
      if ((e as { status?: number }).status === 404) setQuotation(null); else setError(errorText(e));
    }
  }, [projectId]);
  useEffect(() => { Promise.resolve().then(load); }, [load]);

  const open = () => navigate(`/projects/${projectId}/quotation`);
  if (error) return <div className="mb-5"><ErrorState message={error} onRetry={load} /></div>;
  if (quotation === undefined) return <Skeleton className="mb-5 h-24 w-full rounded-card" />;

  const waiting = homeowner && quotation?.status === 'SENT';
  return (
    <section aria-labelledby="quotation-summary"
      className={`mb-5 flex flex-col gap-4 rounded-card border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6 ${waiting ? 'border-blue-100 bg-brand-soft' : 'border-line bg-surface'}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><Receipt className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="quotation-summary" className="text-[15px] font-semibold text-slate-900">{t('quotation.title')}</h2>
            {quotation && <StatusChip kind="quotation" value={quotation.status} size="sm" />}
          </div>
          {quotation ? (
            <>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatMoney(quotation.total)}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {t('quotation.revision', { n: quotation.revisionNo })} · {t('quotation.lines', { n: quotation.items.length })}
                <StatusChip kind="budget" value={quotation.budget.status} size="sm" />
              </p>
            </>
          ) : <p className="mt-1 text-sm text-slate-600">{t(homeowner ? 'quotation.empty.waitingStaff' : 'quotation.empty.staff')}</p>}
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
