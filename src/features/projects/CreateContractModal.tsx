import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Banner, Button, ErrorState, Field, Input, Modal, Textarea } from '@/components/ui';
import { errorText, formatNumber, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { createContract } from './services/contractsApi';
import { MAX_REVISIONS_RANGE, REVIEW_WINDOW_RANGE, STAGE_ORDER, dueTriggerFor, fixedSchedule, parseIntInRange, splitAmounts } from './contractTerms';
import type { CreateContractPayload, StageType } from './services/contractsApi';

export type ContractToast = { tone: 'success' | 'error' | 'warning'; message: string };

interface Props {
  projectId: string;
  onClose: () => void;
  /** 201: the project is now CONTRACT_PENDING. */
  onCreated: () => void;
  /** 409 CONTRACT_ALREADY_EXISTS: show the existing contract. */
  onAlreadyExists: () => void;
  onToast: (toast: ContractToast) => void;
}

/**
 * One row per stage of STAGE_ORDER; the stage and due trigger are fixed. `typed` is the amount the Staff set by hand,
 * '' while the row takes its share of the fee automatically (see splitAmounts).
 */
type MilestoneRow = { name: string; typed: string };

const stageName = (s: StageType) => t(`newContract.stageType.${s}`);
const defaultRows = (): MilestoneRow[] => STAGE_ORDER.map((s) => ({ name: stageName(s), typed: '' }));
/** "25" / "12.5": the row's share of the fee, to one decimal. */
const percentOf = (part: bigint, whole: bigint) => String(Number((part * 1000n) / whole) / 10);

/** Whole VND only; anything else is not a valid amount. */
const isAmount = (v: string) => /^\d+$/.test(v.trim()) && BigInt(v.trim()) > 0n;
const toBig = (v: string) => (/^\d+$/.test(v.trim()) ? BigInt(v.trim()) : 0n);
const money = (v: bigint | string) => formatNumber(String(v));

/** Staff: create the project's contract draft and payment schedule (POST /projects/:id/contract). */
export function CreateContractModal({ projectId, onClose, onCreated, onAlreadyExists, onToast }: Props) {
  const [totalDesignFee, setTotalDesignFee] = useState('');
  const [maxRevisions, setMaxRevisions] = useState(String(MAX_REVISIONS_RANGE.default));
  const [reviewDays, setReviewDays] = useState(String(REVIEW_WINDOW_RANGE.default));
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<MilestoneRow[]>(defaultRows);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  /** Row whose amount field has focus: left blank while the Staff clears it, instead of refilling mid-typing. */
  const [focused, setFocused] = useState<number | null>(null);

  const amounts = useMemo(() => splitAmounts(totalDesignFee, rows.map((r) => r.typed)), [totalDesignFee, rows]);
  const sum = useMemo(() => amounts.reduce((n, a) => n + toBig(a), 0n), [amounts]);
  const total = toBig(totalDesignFee);
  const mismatch = isAmount(totalDesignFee) && amounts.every(isAmount) && sum !== total;
  const anyTyped = rows.some((r) => r.typed.trim());

  const setRow = (i: number, patch: Partial<MilestoneRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const resetSplit = () => setRows((rs) => rs.map((r) => ({ ...r, typed: '' })));

  const validate = () => {
    const e: Record<string, string> = {};
    const required = t('common.required');
    if (!isAmount(totalDesignFee)) e.totalDesignFee = totalDesignFee.trim() ? t('common.positive') : required;
    if (parseIntInRange(maxRevisions, MAX_REVISIONS_RANGE) === null) e.maxRevisionsPerStage = t('newContract.maxRevisionsInvalid');
    if (parseIntInRange(reviewDays, REVIEW_WINDOW_RANGE) === null) e.reviewWindowDays = t('newContract.reviewDaysInvalid');
    rows.forEach((r, i) => {
      if (!r.name.trim()) e[`milestones.${i}.name`] = required;
      if (!isAmount(amounts[i])) e[`milestones.${i}.amount`] = amounts[i] ? t('common.positive') : required;
    });
    return e;
  };

  /** Exactly the whitelisted DTO fields: the backend rejects anything else. */
  const payload = (): CreateContractPayload => ({
    totalDesignFee: totalDesignFee.trim(),
    // validate() ran first, so both parse
    maxRevisionsPerStage: parseIntInRange(maxRevisions, MAX_REVISIONS_RANGE)!,
    reviewWindowDays: parseIntInRange(reviewDays, REVIEW_WINDOW_RANGE)!,
    ...(note.trim() ? { note: note.trim() } : {}),
    milestones: fixedSchedule(rows.map((r, i) => ({ name: r.name, amount: amounts[i] }))),
  });

  const fail = (err: unknown) => {
    if (!(err instanceof ApiError)) { setFormError(errorText(err)); return; }
    const d = err.details;
    switch (err.code) {
      case 'VALIDATION_ERROR':
        setErrors(err.fieldErrors);
        setFormError(t('errors.VALIDATION_ERROR'));
        onToast({ tone: 'error', message: t('newContract.validationToast') });
        return;
      case 'NOT_PROJECT_STAFF':
      case 'INSUFFICIENT_ROLE': onToast({ tone: 'error', message: t('newContract.notProjectStaff') }); return;
      case 'SITE_SURVEY_NOT_CONFIRMED': onToast({ tone: 'error', message: t('newContract.siteSurveyNotConfirmed') }); return;
      case 'PROJECT_NOT_FOUND': onToast({ tone: 'error', message: t('newContract.projectNotFound') }); return;
      case 'CONTRACT_ALREADY_EXISTS':
        onToast({ tone: 'warning', message: t('newContract.alreadyExists') });
        onAlreadyExists();
        return;
      case 'CONTRACT_NO_GENERATION_FAILED': onToast({ tone: 'error', message: t('newContract.numberFailed') }); return;
      case 'INVALID_MILESTONES': {
        const message = err.messages[0] ?? err.message;
        setFormError(message);
        onToast({ tone: 'error', message });
        return;
      }
      case 'MILESTONE_TOTAL_MISMATCH':
        setFormError(t('newContract.mismatch', {
          sum: money(String(d.milestonesTotal ?? sum)),
          total: money(String(d.totalDesignFee ?? totalDesignFee)),
        }));
        onToast({ tone: 'error', message: t('newContract.totalMismatchToast') });
        return;
      case 'INVALID_PROJECT_STATUS_TRANSITION': onToast({ tone: 'error', message: t('newContract.wrongStatus') }); return;
      default: setFormError(errorText(err));
    }
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e); setFormError('');
    if (Object.keys(e).length || mismatch) return;
    setBusy(true);
    try {
      await createContract(projectId, payload());
      onToast({ tone: 'success', message: t('newContract.success') });
      onCreated();
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  return (
    <Modal size="md" title={t('newContract.title')} onClose={busy ? () => {} : onClose} footer={<>
      <Button onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
      <Button type="submit" form="create-contract-form" variant="primary" loading={busy} disabled={mismatch}>{busy ? t('newContract.creating') : t('newContract.create')}</Button>
    </>}>
      <form id="create-contract-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('newContract.totalFee')} error={errors.totalDesignFee} className="sm:col-span-2">
            {(f) => <Input {...f} inputMode="numeric" value={totalDesignFee} invalid={!!errors.totalDesignFee} onChange={(e) => setTotalDesignFee(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 50000000" />}
          </Field>
          <Field label={t('newContract.maxRevisions')} hint={t('newContract.maxRevisionsTooltip')} error={errors.maxRevisionsPerStage}>
            {(f) => <Input {...f} type="number" min={MAX_REVISIONS_RANGE.min} max={MAX_REVISIONS_RANGE.max} step={1} title={t('newContract.maxRevisionsTooltip')} value={maxRevisions} invalid={!!errors.maxRevisionsPerStage} onChange={(e) => setMaxRevisions(e.target.value)} />}
          </Field>
          <Field label={t('newContract.reviewDays')} hint={t('newContract.reviewDaysHint')} error={errors.reviewWindowDays}>
            {(f) => <Input {...f} type="number" min={REVIEW_WINDOW_RANGE.min} max={REVIEW_WINDOW_RANGE.max} step={1} value={reviewDays} invalid={!!errors.reviewWindowDays} onChange={(e) => setReviewDays(e.target.value)} />}
          </Field>
        </div>

        <fieldset>
          <legend className="text-[13px] font-medium text-slate-700">{t('newContract.milestones')}</legend>
          <div className="mb-2 mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-xs text-slate-500">{t('newContract.splitHelp')}</p>
            {anyTyped && <Button size="sm" variant="ghost" onClick={resetSplit}>{t('newContract.resetSplit')}</Button>}
          </div>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={STAGE_ORDER[i]} className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{t('newContract.milestone', { n: i + 1 })} · {stageName(STAGE_ORDER[i])}</span>
                  {' · '}{t(`newContract.dueTrigger.${dueTriggerFor(STAGE_ORDER[i])}`)}
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('newContract.name')} error={errors[`milestones.${i}.name`]}>
                    {(f) => <Input {...f} maxLength={150} value={r.name} invalid={!!errors[`milestones.${i}.name`]} onChange={(e) => setRow(i, { name: e.target.value })} />}
                  </Field>
                  <Field label={t('newContract.amount')} error={errors[`milestones.${i}.amount`]}
                    hint={total > 0n ? t(r.typed.trim() ? 'newContract.shareTyped' : 'newContract.shareAuto', { pct: percentOf(toBig(amounts[i]), total) }) : undefined}>
                    {(f) => <Input {...f} inputMode="numeric" invalid={!!errors[`milestones.${i}.amount`]}
                      value={focused === i && !r.typed ? '' : amounts[i]}
                      onFocus={() => setFocused(i)} onBlur={() => setFocused(null)}
                      onChange={(e) => setRow(i, { typed: e.target.value.replace(/\D/g, '') })} />}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs tabular-nums text-slate-600">{t('newContract.sum', { sum: money(sum), total: money(total) })}</p>
          {mismatch && <div className="mt-2"><Banner tone="amber">{t('newContract.mismatch', { sum: money(sum), total: money(total) })}</Banner></div>}
        </fieldset>

        <Field label={t('newContract.note')} optional error={errors.note}>
          {(f) => <Textarea {...f} rows={3} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>

        {formError && <ErrorState message={formError} />}
      </form>
    </Modal>
  );
}
