import React, { useEffect, useMemo, useState } from 'react';
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { toast } from '@/components/ui';
import {
  createProjectContract,
  getContractById,
  isUuid,
  updateContractDraft,
  type CreateContractPayload,
  type StageType,
} from '@/features/projects/services/contractsApi';
import {
  changedTerms, dueTriggerFor, fixedSchedule, MAX_REVISIONS_RANGE, parseIntInRange, REVIEW_WINDOW_RANGE, rowsFromMilestones, splitAmounts, STAGE_ORDER,
} from '@/features/projects/contractTerms';

/**
 * One row per stage of STAGE_ORDER; the stage and due trigger are fixed. `typed` is the amount set by hand,
 * '' while the row takes its share of the fee automatically (see splitAmounts).
 */
interface MilestoneRow {
  name: string;
  typed: string;
}

const stageName = (s: StageType) => t(`newContract.stageType.${s}`);

/** Parse a VND string into a number for display/comparison; NaN when invalid. */
function toNumber(value: string): number {
  const trimmed = value.trim();
  return /^\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : NaN;
}

const vnd = new Intl.NumberFormat('en-US');

interface CreateContractProps {
  /** 409 CONTRACT_ALREADY_EXISTS: lets an embedding page reload and show the existing contract. */
  onAlreadyExists?: () => void;
}

export const CreateContract: React.FC<CreateContractProps> = ({ onAlreadyExists }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const [totalDesignFee, setTotalDesignFee] = useState('');
  const [maxRevisionsPerStage, setMaxRevisionsPerStage] = useState(String(MAX_REVISIONS_RANGE.default));
  const [reviewWindowDays, setReviewWindowDays] = useState(String(REVIEW_WINDOW_RANGE.default));
  const [note, setNote] = useState('');
  const [milestones, setMilestones] = useState<MilestoneRow[]>(() => STAGE_ORDER.map((s) => ({ name: stageName(s), typed: '' })));

  /** Edit mode: PATCH /contracts/:id instead of POST /projects/:id/contract. */
  const contractId = params.get('contractId') ?? '';
  const editing = contractId !== '';
  const [loadingContract, setLoadingContract] = useState(editing);
  /** An unsigned PDF is already uploaded: it goes stale once the terms change. */
  const [hasUnsignedFile, setHasUnsignedFile] = useState(false);
  /** Edit mode: the terms as loaded, so the PATCH only sends what the Staff changed. */
  const [original, setOriginal] = useState<CreateContractPayload | null>(null);
  /** Edit mode: the contract is no longer DRAFT / NOT_SENT, so the form is read-only. */
  const [locked, setLocked] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Edit mode: prefill from the saved contract. A contract that can't be edited any more goes back to its page.
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    getContractById(contractId)
      .then((c) => {
        if (cancelled) return;
        if (!c) {
          // Quiet 404: nothing to edit, so go back with a neutral notice.
          toast.warning(t('contractPage.notAvailableTitle'));
          window.setTimeout(() => navigate(-1), 1500);
          return;
        }
        // Show the saved terms either way; a contract past DRAFT / NOT_SENT is shown read-only.
        if (c.status !== 'DRAFT' || c.esignStatus !== 'NOT_SENT') {
          setLocked(true);
          toast.error(t('contractPage.editNotEditable'));
        }
        const money = (v: string) => v.replace(/\.0+$/, ''); // "50000000.00" -> "50000000"
        // Always the four fixed rows; saved amounts count as set by hand. An older draft missing a stage opens with
        // that row automatic, so it takes whatever is left of the fee.
        const rows = rowsFromMilestones(c.milestones.map((m) => ({ ...m, amount: money(m.amount) })), stageName)
          .map((r) => ({ name: r.name, typed: r.amount }));
        setProjectId(c.projectId);
        setHasUnsignedFile(c.unsignedFile !== null);
        setTotalDesignFee(money(c.totalDesignFee));
        setMaxRevisionsPerStage(String(c.maxRevisionsPerStage));
        setReviewWindowDays(String(c.reviewWindowDays));
        setNote(c.note ?? '');
        setMilestones(rows);
        setOriginal({
          totalDesignFee: money(c.totalDesignFee),
          maxRevisionsPerStage: c.maxRevisionsPerStage,
          reviewWindowDays: c.reviewWindowDays,
          ...(c.note ? { note: c.note.trim() } : {}),
          // The saved schedule as it really is, so a reordered or incomplete one counts as changed and gets fixed on save.
          milestones: [...c.milestones].sort((a, b) => a.seqNo - b.seqNo).map((m) => ({
            seqNo: m.seqNo, name: m.name.trim(), stageType: m.stageType, amount: money(m.amount).trim(), dueTrigger: m.dueTrigger,
          })),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'INSUFFICIENT_ROLE') toast.error(t('contractPage.noContractAccess'));
        else if (err instanceof ApiError && err.code === 'BAD_REQUEST') toast.error(t('contractPage.invalidContractId'));
        else handleError(err);
      })
      .finally(() => { if (!cancelled) setLoadingContract(false); });
    return () => { cancelled = true; };
    // handleError only reads state setters and props; the load must run once per contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const updateMilestone = (index: number, patch: Partial<MilestoneRow>) =>
    setMilestones((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  /** Row whose amount field has focus: left blank while the Staff clears it, instead of refilling mid-typing. */
  const [focused, setFocused] = useState<number | null>(null);
  const amounts = useMemo(() => splitAmounts(totalDesignFee, milestones.map((r) => r.typed)), [totalDesignFee, milestones]);
  const anyTyped = milestones.some((r) => r.typed.trim());

  const milestonesTotal = useMemo(
    () => amounts.reduce((sum, a) => {
      const amount = toNumber(a);
      return Number.isNaN(amount) ? sum : sum + amount;
    }, 0),
    [amounts],
  );

  const feeNumber = toNumber(totalDesignFee);
  const feeValid = !Number.isNaN(feeNumber) && feeNumber > 0;
  const totalsMatch = feeValid && milestonesTotal === feeNumber;
  const projectIdValid = isUuid(projectId);

  const revisionsValue = parseIntInRange(maxRevisionsPerStage, MAX_REVISIONS_RANGE);
  const reviewDaysValue = parseIntInRange(reviewWindowDays, REVIEW_WINDOW_RANGE);

  /** Client checks for the integer terms; the backend's VALIDATION_ERROR lands on the same keys. */
  const termErrors = (): Record<string, string> => ({
    ...(revisionsValue === null ? { maxRevisionsPerStage: t('newContract.maxRevisionsInvalid') } : {}),
    ...(reviewDaysValue === null ? { reviewWindowDays: t('newContract.reviewDaysInvalid') } : {}),
  });

  /** Only call after termErrors() came back empty. */
  const buildPayload = (): CreateContractPayload => ({
    totalDesignFee: totalDesignFee.trim(),
    maxRevisionsPerStage: revisionsValue!,
    reviewWindowDays: reviewDaysValue!,
    ...(note.trim() ? { note: note.trim() } : {}),
    milestones: fixedSchedule(milestones.map((r, i) => ({ name: r.name, amount: amounts[i] }))),
  });

  const handleError = (err: unknown) => {
    if (!(err instanceof ApiError)) { setError(t('errors.unknownNoCode')); return; }
    switch (err.code) {
      case 'VALIDATION_ERROR':
        setFieldErrors(err.fieldErrors);
        setError(t('errors.VALIDATION_ERROR'));
        if (editing) toast.error(t('contractPage.editValidation'));
        return;
      case 'NOT_PROJECT_STAFF':
      case 'INSUFFICIENT_ROLE':
        toast.error(t(editing ? 'contractPage.editNotStaff' : 'newContract.notProjectStaff'));
        return;
      case 'CONTRACT_NOT_FOUND': toast.error(t('contractPage.editNotFound')); return;
      case 'CONTRACT_NOT_EDITABLE':
        setLocked(true);
        toast.error(t('contractPage.editNotEditable'));
        return;
      case 'PROJECT_NOT_FOUND': toast.error(t('newContract.projectNotFound')); return;
      case 'CONTRACT_ALREADY_EXISTS':
        toast.warning(t('newContract.alreadyExists'));
        if (onAlreadyExists) onAlreadyExists();
        else window.setTimeout(() => navigate(`/project-contract?projectId=${encodeURIComponent(projectId.trim())}`), 1200);
        return;
      case 'CONTRACT_NO_GENERATION_FAILED': toast.error(t('newContract.numberFailed')); return;
      case 'INVALID_MILESTONES': {
        const message = err.messages[0] ?? err.message;
        setError(message);
        toast.error(message);
        return;
      }
      case 'MILESTONE_TOTAL_MISMATCH':
        if (editing) toast.error(t('contractPage.editTotalMismatch'));
        setError(t('newContract.mismatch', {
          sum: vnd.format(Number(err.details.milestonesTotal ?? milestonesTotal)),
          total: vnd.format(Number(err.details.totalDesignFee ?? feeNumber)),
        }));
        return;
      case 'INVALID_PROJECT_STATUS_TRANSITION': toast.error(t('newContract.wrongStatus')); return;
      default: setError(err.message || t('errors.unknownNoCode'));
    }
  };

  const fieldError = (key: string) => (fieldErrors[key]
    ? <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">{fieldErrors[key]}</p>
    : null);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
    const clientErrors = termErrors();
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setError(t('errors.VALIDATION_ERROR'));
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        const next = buildPayload();
        const changes = changedTerms(original, next);
        if (!Object.keys(changes).length) {
          toast.warning(t('editContract.noChanges'));
          return;
        }
        await updateContractDraft(contractId, changes);
        setSuccess(t('editContract.success'));
        if (hasUnsignedFile) toast.warning(t('contractPage.stalePdf'));
        window.setTimeout(() => navigate(`/project-contract?projectId=${encodeURIComponent(projectId.trim())}`), hasUnsignedFile ? 2500 : 1000);
        return;
      }
      const contract = await createProjectContract(projectId.trim(), buildPayload());
      setSuccess(`Contract ${contract.contractNo} created. The project is now CONTRACT_PENDING.`);
      // Return to the project detail view after a brief confirmation.
      window.setTimeout(() => navigate(`/staff/projects/${encodeURIComponent(projectId.trim())}`), 1200);
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const labelClass = 'block text-[11px] font-bold text-slate-500 mb-1.5';
  const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600';

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans flex flex-col justify-between">
      <Header role="staff" />

      <main className="w-full max-w-[1100px] mx-auto px-6 lg:px-12 py-10 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{editing ? t('editContract.title') : 'Create contract'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Enter the contract terms and payment schedule. Milestone amounts must equal the design fee.
          </p>
        </div>

        {/* Success / error banners */}
        {success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {locked && (
          <div role="status" className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <span>{t('editContract.locked')}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Terms and schedule: read-only once the contract has left DRAFT / NOT_SENT. */}
          <fieldset disabled={locked} className="m-0 min-w-0 space-y-6 border-0 p-0">
          {/* Terms */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Contract details</h2>

            <div className="mb-4">
              <label className={labelClass}>Project ID (UUID)</label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={editing}
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                className={`${inputClass} ${projectId && !projectIdValid ? 'border-red-300 focus:ring-red-500' : ''}`}
              />
              {projectId && !projectIdValid && (
                <p className="mt-1 text-[11px] font-semibold text-red-600">Project ID must be a valid UUID.</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Total design fee (VND)</label>
                <input
                  type="number" min="1" inputMode="numeric"
                  value={totalDesignFee}
                  onChange={(e) => setTotalDesignFee(e.target.value)}
                  placeholder="50000000"
                  className={inputClass}
                />
                {fieldError('totalDesignFee')}
              </div>
              <div>
                <label htmlFor="contract-max-revisions" className={labelClass} title={t('newContract.maxRevisionsTooltip')}>
                  {t('newContract.maxRevisions')} ({MAX_REVISIONS_RANGE.min}–{MAX_REVISIONS_RANGE.max})
                </label>
                <input
                  id="contract-max-revisions"
                  type="number" min={MAX_REVISIONS_RANGE.min} max={MAX_REVISIONS_RANGE.max} step={1} inputMode="numeric"
                  value={maxRevisionsPerStage}
                  onChange={(e) => setMaxRevisionsPerStage(e.target.value)}
                  title={t('newContract.maxRevisionsTooltip')}
                  aria-describedby="contract-max-revisions-help"
                  aria-invalid={revisionsValue === null || !!fieldErrors.maxRevisionsPerStage}
                  className={`${inputClass} ${revisionsValue === null ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {fieldErrors.maxRevisionsPerStage ? fieldError('maxRevisionsPerStage')
                  : revisionsValue === null
                    ? <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">{t('newContract.maxRevisionsInvalid')}</p>
                    : <p id="contract-max-revisions-help" className="mt-1 text-[11px] text-slate-500">{t('newContract.maxRevisionsTooltip')}</p>}
              </div>
              <div>
                <label htmlFor="contract-review-days" className={labelClass}>{t('newContract.reviewDays')} ({REVIEW_WINDOW_RANGE.min}–{REVIEW_WINDOW_RANGE.max})</label>
                <input
                  id="contract-review-days"
                  type="number" min={REVIEW_WINDOW_RANGE.min} max={REVIEW_WINDOW_RANGE.max} step={1} inputMode="numeric"
                  value={reviewWindowDays}
                  onChange={(e) => setReviewWindowDays(e.target.value)}
                  aria-invalid={reviewDaysValue === null || !!fieldErrors.reviewWindowDays}
                  className={`${inputClass} ${reviewDaysValue === null ? 'border-red-300 focus:ring-red-500' : ''}`}
                />
                {fieldErrors.reviewWindowDays ? fieldError('reviewWindowDays')
                  : reviewDaysValue === null && <p role="alert" className="mt-1 text-[11px] font-semibold text-red-600">{t('newContract.reviewDaysInvalid')}</p>}
              </div>
            </div>

            <div className="mt-4">
              <label className={labelClass}>Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={5000}
                placeholder="Additional terms, scope of work…"
                className={`${inputClass} resize-y`}
              />
              {fieldError('note')}
            </div>
          </section>

          {/* Milestones */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Payment milestones</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t('newContract.splitHelp')}</p>
              </div>
              {anyTyped && (
                <button type="button" onClick={() => setMilestones((rows) => rows.map((r) => ({ ...r, typed: '' })))}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                  {t('newContract.resetSplit')}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {milestones.map((row, index) => (
                <div key={STAGE_ORDER[index]} className="rounded-xl border border-slate-100 bg-slate-50/40 p-3">
                  <p className="mb-2 text-xs text-slate-500">
                    <span className="font-bold text-slate-800">#{index + 1} · {stageName(STAGE_ORDER[index])}</span>
                    {' · '}{t(`newContract.dueTrigger.${dueTriggerFor(STAGE_ORDER[index])}`)}
                  </p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={labelClass}>Milestone name</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateMilestone(index, { name: e.target.value })}
                      placeholder="Design deposit"
                      className={inputClass}
                    />
                    {fieldError(`milestones.${index}.name`)}
                  </div>
                  <div>
                    <label className={labelClass}>Amount (VND)</label>
                    <input
                      type="text" inputMode="numeric"
                      value={focused === index && !row.typed ? '' : amounts[index]}
                      onFocus={() => setFocused(index)}
                      onBlur={() => setFocused(null)}
                      onChange={(e) => updateMilestone(index, { typed: e.target.value.replace(/D/g, '') })}
                      className={inputClass}
                    />
                    {fieldErrors[`milestones.${index}.amount`] ? fieldError(`milestones.${index}.amount`)
                      : feeValid && <p className="mt-1 text-[11px] text-slate-500">{t(row.typed.trim() ? 'newContract.shareTyped' : 'newContract.shareAuto', { pct: String(Math.round((toNumber(amounts[index]) || 0) / feeNumber * 1000) / 10) })}</p>}
                  </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live total vs fee */}
            <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Milestone total</span>
                <span className="font-bold text-slate-900">VND {vnd.format(milestonesTotal)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-500">Total design fee</span>
                <span className="font-bold text-slate-900">{feeValid ? `VND ${vnd.format(feeNumber)}` : '—'}</span>
              </div>
              {feeValid && !totalsMatch && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                  <AlertCircle size={13} />
                  {t('newContract.mismatch', { sum: vnd.format(milestonesTotal), total: vnd.format(feeNumber) })}
                </p>
              )}
              {totalsMatch && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> Milestone total matches the design fee.
                </p>
              )}
            </div>
          </section>
          </fieldset>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || loadingContract || locked || !projectIdValid || !totalsMatch || revisionsValue === null || reviewDaysValue === null}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} />
              {editing ? (submitting ? t('editContract.saving') : t('editContract.save')) : (submitting ? 'Creating…' : 'Create contract')}
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CreateContract;
