import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Banner, Button, ErrorState, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { errorText, formatNumber, t } from '@/i18n';
import { ApiError } from '@/services/authService';
import { createContract } from './services/contractsApi';
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

type MilestoneRow = { name: string; stageType: StageType; amount: string };

/** Stages after the deposit, in contract order; each may appear once. */
const LATER_STAGES: StageType[] = ['LAYOUT_2D', 'RENDER_3D', 'FINAL_PACKAGE'];
const MAX_MILESTONES = 4;
const stageName = (s: StageType) => t(`newContract.stageType.${s}`);

const defaultRows = (): MilestoneRow[] => [
  { name: stageName('DEPOSIT'), stageType: 'DEPOSIT', amount: '' },
  ...LATER_STAGES.map((s) => ({ name: stageName(s), stageType: s, amount: '' })),
];

/** Whole VND only; anything else is not a valid amount. */
const isAmount = (v: string) => /^\d+$/.test(v.trim()) && BigInt(v.trim()) > 0n;
const toBig = (v: string) => (/^\d+$/.test(v.trim()) ? BigInt(v.trim()) : 0n);
const money = (v: bigint | string) => formatNumber(String(v));

/** Staff: create the project's contract draft and payment schedule (POST /projects/:id/contract). */
export function CreateContractModal({ projectId, onClose, onCreated, onAlreadyExists, onToast }: Props) {
  const [totalDesignFee, setTotalDesignFee] = useState('');
  const [maxRevisions, setMaxRevisions] = useState('2');
  const [reviewDays, setReviewDays] = useState('7');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<MilestoneRow[]>(defaultRows);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const sum = useMemo(() => rows.reduce((n, r) => n + toBig(r.amount), 0n), [rows]);
  const total = toBig(totalDesignFee);
  const mismatch = isAmount(totalDesignFee) && rows.every((r) => isAmount(r.amount)) && sum !== total;

  const setRow = (i: number, patch: Partial<MilestoneRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const usedStages = (except: number) => rows.filter((_, j) => j !== except).map((r) => r.stageType);
  const addRow = () => setRows((rs) => {
    const free = LATER_STAGES.find((s) => !rs.some((r) => r.stageType === s));
    return free && rs.length < MAX_MILESTONES ? [...rs, { name: stageName(free), stageType: free, amount: '' }] : rs;
  });
  const removeRow = () => setRows((rs) => (rs.length > 1 ? rs.slice(0, -1) : rs));

  const validate = () => {
    const e: Record<string, string> = {};
    const required = t('common.required');
    if (!isAmount(totalDesignFee)) e.totalDesignFee = totalDesignFee.trim() ? t('common.positive') : required;
    const rev = Number(maxRevisions);
    if (maxRevisions.trim() === '' || !Number.isInteger(rev) || rev < 0 || rev > 20) e.maxRevisionsPerStage = t('newContract.maxRevisionsHint');
    const days = Number(reviewDays);
    if (reviewDays.trim() === '' || !Number.isInteger(days) || days < 1 || days > 60) e.reviewWindowDays = t('newContract.reviewDaysHint');
    rows.forEach((r, i) => {
      if (!r.name.trim()) e[`milestones.${i}.name`] = required;
      if (!isAmount(r.amount)) e[`milestones.${i}.amount`] = r.amount.trim() ? t('common.positive') : required;
      if (i > 0 && usedStages(i).includes(r.stageType)) e[`milestones.${i}.stageType`] = t('newContract.stageDuplicate');
    });
    return e;
  };

  /** Exactly the whitelisted DTO fields: the backend rejects anything else. */
  const payload = (): CreateContractPayload => ({
    totalDesignFee: totalDesignFee.trim(),
    maxRevisionsPerStage: Number(maxRevisions),
    reviewWindowDays: Number(reviewDays),
    ...(note.trim() ? { note: note.trim() } : {}),
    milestones: rows.map((r, i) => ({
      seqNo: i + 1,
      name: r.name.trim(),
      stageType: i === 0 ? 'DEPOSIT' : r.stageType,
      amount: r.amount.trim(),
      dueTrigger: i === 0 ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED',
    })),
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

  const freeStage = LATER_STAGES.some((s) => !rows.some((r) => r.stageType === s));

  return (
    <Modal size="md" title={t('newContract.title')} onClose={busy ? () => {} : onClose} footer={<>
      <Button onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
      <Button type="submit" form="create-contract-form" variant="primary" loading={busy} disabled={mismatch}>{busy ? t('newContract.creating') : t('newContract.create')}</Button>
    </>}>
      <form id="create-contract-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('newContract.totalFee')} error={errors.totalDesignFee} className="sm:col-span-3">
            {(f) => <Input {...f} inputMode="numeric" value={totalDesignFee} invalid={!!errors.totalDesignFee} onChange={(e) => setTotalDesignFee(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 50000000" />}
          </Field>
          <Field label={t('newContract.maxRevisions')} hint={t('newContract.maxRevisionsHint')} error={errors.maxRevisionsPerStage}>
            {(f) => <Input {...f} type="number" min={0} max={20} value={maxRevisions} invalid={!!errors.maxRevisionsPerStage} onChange={(e) => setMaxRevisions(e.target.value)} />}
          </Field>
          <Field label={t('newContract.reviewDays')} hint={t('newContract.reviewDaysHint')} error={errors.reviewWindowDays}>
            {(f) => <Input {...f} type="number" min={1} max={60} value={reviewDays} invalid={!!errors.reviewWindowDays} onChange={(e) => setReviewDays(e.target.value)} />}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-slate-700">{t('newContract.milestones')}</legend>
          <ul className="space-y-3">
            {rows.map((r, i) => (
              <li key={i} className="rounded-lg border border-line p-3">
                <p className="mb-2 text-xs font-medium text-slate-500">{t('newContract.milestone', { n: i + 1 })} · {t(`newContract.dueTrigger.${i === 0 ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED'}`)}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label={t('newContract.name')} error={errors[`milestones.${i}.name`]}>
                    {(f) => <Input {...f} maxLength={150} value={r.name} invalid={!!errors[`milestones.${i}.name`]} onChange={(e) => setRow(i, { name: e.target.value })} />}
                  </Field>
                  <Field label={t('newContract.stage')} error={errors[`milestones.${i}.stageType`]}>
                    {(f) => (
                      <Select {...f} value={i === 0 ? 'DEPOSIT' : r.stageType} disabled={i === 0} invalid={!!errors[`milestones.${i}.stageType`]}
                        onChange={(e) => setRow(i, { stageType: e.target.value as StageType })}>
                        {i === 0
                          ? <option value="DEPOSIT">{stageName('DEPOSIT')}</option>
                          : LATER_STAGES.map((s) => <option key={s} value={s} disabled={usedStages(i).includes(s)}>{stageName(s)}</option>)}
                      </Select>
                    )}
                  </Field>
                  <Field label={t('newContract.amount')} error={errors[`milestones.${i}.amount`]}>
                    {(f) => <Input {...f} inputMode="numeric" value={r.amount} invalid={!!errors[`milestones.${i}.amount`]} onChange={(e) => setRow(i, { amount: e.target.value.replace(/\D/g, '') })} />}
                  </Field>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {rows.length < MAX_MILESTONES && freeStage && <Button size="sm" onClick={addRow}>{t('newContract.addMilestone')}</Button>}
            {rows.length > 1 && <Button size="sm" onClick={removeRow}>{t('newContract.removeMilestone')}</Button>}
          </div>
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
