import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { t } from '@/i18n';
import { ApiError } from '@/services/authService';
import {
  createProjectContract,
  getContractById,
  isUuid,
  updateContractDraft,
  type CreateContractPayload,
  type DueTrigger,
  type PaymentMilestoneInput,
  type StageType,
} from '@/features/projects/services/contractsApi';

const STAGE_TYPES: { value: StageType; label: string }[] = [
  { value: 'DEPOSIT', label: 'Deposit (DEPOSIT)' },
  { value: 'LAYOUT_2D', label: '2D layout (LAYOUT_2D)' },
  { value: 'RENDER_3D', label: '3D render (RENDER_3D)' },
  { value: 'FINAL_PACKAGE', label: 'Final package (FINAL_PACKAGE)' },
];

const DUE_TRIGGERS: { value: DueTrigger; label: string }[] = [
  { value: 'ON_CONTRACT_ACTIVE', label: 'When the contract becomes active (ON_CONTRACT_ACTIVE)' },
  { value: 'ON_STAGE_APPROVED', label: 'When the stage is approved (ON_STAGE_APPROVED)' },
];

/** The trigger the backend expects for a given stage (DEPOSIT is paid on activation). */
function defaultTrigger(stageType: StageType): DueTrigger {
  return stageType === 'DEPOSIT' ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED';
}

interface MilestoneRow {
  name: string;
  stageType: StageType;
  amount: string;
  dueTrigger: DueTrigger;
}

const EMPTY_MILESTONE: MilestoneRow = {
  name: '',
  stageType: 'DEPOSIT',
  amount: '',
  dueTrigger: 'ON_CONTRACT_ACTIVE',
};

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

/** Row 1 is always the deposit; later rows can't repeat it. */
const LATER_STAGE_TYPES = STAGE_TYPES.filter((s) => s.value !== 'DEPOSIT');
const MAX_MILESTONES = 4;

export const CreateContract: React.FC<CreateContractProps> = ({ onAlreadyExists }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [projectId, setProjectId] = useState(params.get('projectId') ?? '');
  const [totalDesignFee, setTotalDesignFee] = useState('');
  const [maxRevisionsPerStage, setMaxRevisionsPerStage] = useState('3');
  const [reviewWindowDays, setReviewWindowDays] = useState('7');
  const [note, setNote] = useState('');
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { ...EMPTY_MILESTONE, name: 'Design deposit' },
  ]);

  /** Edit mode: PATCH /contracts/:id instead of POST /projects/:id/contract. */
  const contractId = params.get('contractId') ?? '';
  const editing = contractId !== '';
  const [loadingContract, setLoadingContract] = useState(editing);
  /** An unsigned PDF is already uploaded: it goes stale once the terms change. */
  const [hasUnsignedFile, setHasUnsignedFile] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ tone: 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Edit mode: prefill from the saved contract. A contract that can't be edited any more goes back to its page.
  useEffect(() => {
    if (!contractId) return;
    let cancelled = false;
    getContractById(contractId)
      .then((c) => {
        if (cancelled) return;
        if (!c) {
          // Quiet 404: nothing to edit, so go back with a neutral notice.
          setToast({ tone: 'warning', message: t('contractPage.notAvailableTitle') });
          window.setTimeout(() => navigate(-1), 1500);
          return;
        }
        if (c.status !== 'DRAFT' || c.esignStatus !== 'NOT_SENT') {
          setToast({ tone: 'error', message: t('editContract.notEditable') });
          window.setTimeout(() => navigate(`/project-contract?projectId=${encodeURIComponent(c.projectId)}`), 1500);
          return;
        }
        const money = (v: string) => v.replace(/\.0+$/, ''); // "50000000.00" -> "50000000"
        setProjectId(c.projectId);
        setHasUnsignedFile(c.unsignedFile !== null);
        setTotalDesignFee(money(c.totalDesignFee));
        setMaxRevisionsPerStage(String(c.maxRevisionsPerStage));
        setReviewWindowDays(String(c.reviewWindowDays));
        setNote(c.note ?? '');
        setMilestones(c.milestones.map((m, i) => ({
          name: m.name,
          stageType: i === 0 ? 'DEPOSIT' : m.stageType,
          amount: money(m.amount),
          dueTrigger: i === 0 ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED',
        })));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === 'INSUFFICIENT_ROLE') setToast({ tone: 'error', message: t('contractPage.noContractAccess') });
        else if (err instanceof ApiError && err.code === 'BAD_REQUEST') setToast({ tone: 'error', message: t('contractPage.invalidContractId') });
        else handleError(err);
      })
      .finally(() => { if (!cancelled) setLoadingContract(false); });
    return () => { cancelled = true; };
    // handleError only reads state setters and props; the load must run once per contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId]);

  const updateMilestone = (index: number, patch: Partial<MilestoneRow>) => {
    setMilestones((rows) => rows.map((row, i) => {
      if (i !== index) return row;
      // Row 1 is fixed DEPOSIT / ON_CONTRACT_ACTIVE; every other row is ON_STAGE_APPROVED.
      const next = { ...row, ...patch };
      if (index === 0) next.stageType = 'DEPOSIT';
      next.dueTrigger = defaultTrigger(next.stageType);
      return next;
    }));
  };

  const addMilestone = () => setMilestones((rows) => {
    if (rows.length >= MAX_MILESTONES) return rows;
    const stageType: StageType = rows.length === 0 ? 'DEPOSIT' : 'LAYOUT_2D';
    return [...rows, { ...EMPTY_MILESTONE, stageType, dueTrigger: defaultTrigger(stageType) }];
  });

  const removeMilestone = (index: number) =>
    setMilestones((rows) => rows.filter((_, i) => i !== index));

  const milestonesTotal = useMemo(
    () => milestones.reduce((sum, row) => {
      const amount = toNumber(row.amount);
      return Number.isNaN(amount) ? sum : sum + amount;
    }, 0),
    [milestones],
  );

  const feeNumber = toNumber(totalDesignFee);
  const feeValid = !Number.isNaN(feeNumber) && feeNumber > 0;
  const totalsMatch = feeValid && milestonesTotal === feeNumber;
  const projectIdValid = isUuid(projectId);

  const buildPayload = (): CreateContractPayload => ({
    totalDesignFee: totalDesignFee.trim(),
    maxRevisionsPerStage: Number(maxRevisionsPerStage),
    reviewWindowDays: Number(reviewWindowDays),
    ...(note.trim() ? { note: note.trim() } : {}),
    milestones: milestones.map((row, index): PaymentMilestoneInput => ({
      seqNo: index + 1,
      name: row.name.trim(),
      stageType: index === 0 ? 'DEPOSIT' : row.stageType,
      amount: row.amount.trim(),
      dueTrigger: index === 0 ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED',
    })),
  });

  const handleError = (err: unknown) => {
    if (!(err instanceof ApiError)) { setError(t('errors.unknownNoCode')); return; }
    switch (err.code) {
      case 'VALIDATION_ERROR':
        setFieldErrors(err.fieldErrors);
        setError(t('errors.VALIDATION_ERROR'));
        if (editing) setToast({ tone: 'error', message: t('contractPage.editValidation') });
        return;
      case 'NOT_PROJECT_STAFF':
      case 'INSUFFICIENT_ROLE':
        setToast({ tone: 'error', message: t(editing ? 'contractPage.editNotStaff' : 'newContract.notProjectStaff') });
        return;
      case 'CONTRACT_NOT_FOUND': setToast({ tone: 'error', message: t('contractPage.editNotFound') }); return;
      case 'CONTRACT_NOT_EDITABLE':
        setToast({ tone: 'error', message: t('contractPage.editNotEditable') });
        window.setTimeout(() => navigate(`/project-contract?projectId=${encodeURIComponent(projectId.trim())}`), 1500);
        return;
      case 'PROJECT_NOT_FOUND': setToast({ tone: 'error', message: t('newContract.projectNotFound') }); return;
      case 'CONTRACT_ALREADY_EXISTS':
        setToast({ tone: 'warning', message: t('newContract.alreadyExists') });
        if (onAlreadyExists) onAlreadyExists();
        else window.setTimeout(() => navigate(`/project-contract?projectId=${encodeURIComponent(projectId.trim())}`), 1200);
        return;
      case 'CONTRACT_NO_GENERATION_FAILED': setToast({ tone: 'error', message: t('newContract.numberFailed') }); return;
      case 'INVALID_MILESTONES': {
        const message = err.messages[0] ?? err.message;
        setError(message);
        setToast({ tone: 'error', message });
        return;
      }
      case 'MILESTONE_TOTAL_MISMATCH':
        if (editing) setToast({ tone: 'error', message: t('contractPage.editTotalMismatch') });
        setError(t('newContract.mismatch', {
          sum: vnd.format(Number(err.details.milestonesTotal ?? milestonesTotal)),
          total: vnd.format(Number(err.details.totalDesignFee ?? feeNumber)),
        }));
        return;
      case 'INVALID_PROJECT_STATUS_TRANSITION': setToast({ tone: 'error', message: t('newContract.wrongStatus') }); return;
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
    setToast(null);
    setSubmitting(true);
    try {
      if (editing) {
        // Always send the fee and the whole schedule together so the backend compares matching values.
        const { totalDesignFee: fee, maxRevisionsPerStage: revisions, reviewWindowDays: days, milestones: rows } = buildPayload();
        await updateContractDraft(contractId, {
          totalDesignFee: fee,
          maxRevisionsPerStage: revisions,
          reviewWindowDays: days,
          note: note.trim() ? note.trim() : null,
          milestones: rows,
        });
        setSuccess(t('editContract.success'));
        if (hasUnsignedFile) setToast({ tone: 'warning', message: t('contractPage.stalePdf') });
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
  const inputClass = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand';

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

        {toast && (
          <div
            role="alert"
            className={`fixed right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {toast.message}
          </div>
        )}

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

        <div className="space-y-6">
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
                <label className={labelClass}>Maximum revisions per stage (0–20)</label>
                <input
                  type="number" min="0" max="20"
                  value={maxRevisionsPerStage}
                  onChange={(e) => setMaxRevisionsPerStage(e.target.value)}
                  className={inputClass}
                />
                {fieldError('maxRevisionsPerStage')}
              </div>
              <div>
                <label className={labelClass}>Review period (days, 1–60)</label>
                <input
                  type="number" min="1" max="60"
                  value={reviewWindowDays}
                  onChange={(e) => setReviewWindowDays(e.target.value)}
                  className={inputClass}
                />
                {fieldError('reviewWindowDays')}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Payment milestones</h2>
              <button
                type="button"
                onClick={addMilestone}
                disabled={milestones.length >= MAX_MILESTONES}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={14} /> Add milestone
              </button>
            </div>

            <div className="space-y-3">
              {milestones.map((row, index) => (
                <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50/40 p-3 md:grid-cols-[2.4rem_1fr_1fr_1fr_1fr_2rem] md:items-end">
                  <div className="text-xs font-bold text-slate-400 md:pb-2.5">#{index + 1}</div>
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
                    <label className={labelClass}>Stage</label>
                    <select
                      value={row.stageType}
                      disabled={index === 0}
                      onChange={(e) => updateMilestone(index, { stageType: e.target.value as StageType })}
                      className={inputClass}
                    >
                      {(index === 0 ? STAGE_TYPES : LATER_STAGE_TYPES).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    {fieldError(`milestones.${index}.stageType`)}
                  </div>
                  <div>
                    <label className={labelClass}>Amount (VND)</label>
                    <input
                      type="number" min="1" inputMode="numeric"
                      value={row.amount}
                      onChange={(e) => updateMilestone(index, { amount: e.target.value })}
                      placeholder="15000000"
                      className={inputClass}
                    />
                    {fieldError(`milestones.${index}.amount`)}
                  </div>
                  <div>
                    <label className={labelClass}>Due trigger</label>
                    <select
                      value={row.dueTrigger}
                      disabled
                      className={inputClass}
                    >
                      {DUE_TRIGGERS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    {fieldError(`milestones.${index}.dueTrigger`)}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMilestone(index)}
                    disabled={milestones.length === 1}
                    aria-label="Remove milestone"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
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
              disabled={submitting || loadingContract || !projectIdValid || !totalsMatch}
              onClick={() => void handleSubmit()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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
