// No '@/' runtime imports here: contractTerms.test.ts loads this file with plain `node --test`.
import type { CreateContractPayload, PaymentMilestoneInput, UpdateContractPayload } from './services/contractsApi.ts';

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
