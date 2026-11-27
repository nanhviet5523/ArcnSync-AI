// No '@/' runtime imports here: contractTerms.test.ts loads this file with plain `node --test`.
import type { CreateContractPayload, DueTrigger, PaymentMilestoneInput, StageType, UpdateContractPayload } from './services/contractsApi.ts';

/**
 * Every contract bills all four stages, one milestone each, in this order (seqNo = index + 1).
 * The backend would accept fewer or reordered stages, but without a FINAL_PACKAGE milestone
 * the handover can't be submitted (STAGE_MILESTONE_NOT_FOUND) and the project never completes.
 */
export const STAGE_ORDER: readonly StageType[] = ['DEPOSIT', 'LAYOUT_2D', 'RENDER_3D', 'FINAL_PACKAGE'];

/** The backend checks this pairing but doesn't derive it: DEPOSIT is due on activation, every other stage on approval. */
export const dueTriggerFor = (stage: StageType): DueTrigger => (stage === 'DEPOSIT' ? 'ON_CONTRACT_ACTIVE' : 'ON_STAGE_APPROVED');

/** The fixed schedule from the form's four rows (in STAGE_ORDER): only name and amount are typed by the Staff. */
export function fixedSchedule(rows: readonly { name: string; amount: string }[]): PaymentMilestoneInput[] {
  return STAGE_ORDER.map((stageType, i) => ({
    seqNo: i + 1,
    name: rows[i]?.name.trim() ?? '',
    stageType,
    amount: rows[i]?.amount.trim() ?? '',
    dueTrigger: dueTriggerFor(stageType),
  }));
}

const WHOLE = /^\d+$/;

/**
 * Milestone amounts (whole VND) from the total fee and what the Staff typed: a typed amount is kept as is, and the
 * rows left empty share what is left of the fee evenly, rounded down to `step` (1,000 VND) with the leftover dong on
 * the first of them, so the schedule always adds up to the fee. If the typed amounts already exceed the fee, the
 * empty rows get 0 (the form then shows the mismatch). Without a valid fee, empty rows stay empty.
 */
export function splitAmounts(totalFee: string, typed: readonly string[], step = 1000n): string[] {
  const fee = totalFee.trim();
  const auto = typed.flatMap((v, i) => (v.trim() ? [] : [i]));
  if (!WHOLE.test(fee) || !auto.length) return typed.map((v) => v.trim());
  const typedSum = typed.reduce((n, v) => (WHOLE.test(v.trim()) ? n + BigInt(v.trim()) : n), 0n);
  const rest = BigInt(fee) - typedSum > 0n ? BigInt(fee) - typedSum : 0n;
  const n = BigInt(auto.length);
  const even = rest / n;
  const share = even >= step ? (even / step) * step : even;
  const first = rest - share * (n - 1n);
  return typed.map((v, i) => (v.trim() ? v.trim() : String(i === auto[0] ? first : share)));
}

/**
 * Saved milestones laid onto the four fixed rows, matched by stageType (not seqNo), so an older contract with a
 * missing or reordered stage opens in the right order; a missing stage gets `fallbackName(stage)` and no amount.
 */
export function rowsFromMilestones(
  saved: readonly { stageType: StageType; name: string; amount: string }[],
  fallbackName: (stage: StageType) => string,
): { name: string; amount: string }[] {
  return STAGE_ORDER.map((stage) => {
    const m = saved.find((s) => s.stageType === stage);
    return m ? { name: m.name, amount: m.amount } : { name: fallbackName(stage), amount: '' };
  });
}

/** Backend bounds for the integer contract terms, and the form's starting value. */
export const MAX_REVISIONS_RANGE = { min: 0, max: 20, default: 3 } as const;
export const REVIEW_WINDOW_RANGE = { min: 1, max: 60, default: 7 } as const;

/**
 * Whole number typed in a form field, within [min, max]; null otherwise.
 * Digits only, so "-1", "2.5", "1e1" and "" are all rejected.
 */
export function parseIntInRange(value: string, range: { min: number; max: number }): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= range.min && n <= range.max ? n : null;
}

const sameSchedule = (a: PaymentMilestoneInput[], b: PaymentMilestoneInput[]) =>
  a.length === b.length && a.every((m, i) =>
    m.seqNo === b[i].seqNo && m.name === b[i].name && m.stageType === b[i].stageType
    && m.amount === b[i].amount && m.dueTrigger === b[i].dueTrigger);

/**
 * PATCH /contracts/:id body with only the terms that differ from the loaded contract: a field left out stays unchanged.
 * The fee and the schedule go together when either changes, so the backend checks the total on matching values.
 * A cleared note is sent as null. Without a loaded contract everything is sent.
 */
export function changedTerms(original: CreateContractPayload | null, next: CreateContractPayload): UpdateContractPayload {
  const nextNote = next.note?.trim() || null;
  if (!original) return { ...next, note: nextNote };
  const body: UpdateContractPayload = {};
  if (next.maxRevisionsPerStage !== original.maxRevisionsPerStage) body.maxRevisionsPerStage = next.maxRevisionsPerStage;
  if (next.reviewWindowDays !== original.reviewWindowDays) body.reviewWindowDays = next.reviewWindowDays;
  if (nextNote !== (original.note?.trim() || null)) body.note = nextNote;
  if (next.totalDesignFee !== original.totalDesignFee || !sameSchedule(next.milestones, original.milestones)) {
    body.totalDesignFee = next.totalDesignFee;
    body.milestones = next.milestones;
  }
  return body;
}
