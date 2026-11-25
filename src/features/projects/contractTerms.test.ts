import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedTerms, MAX_REVISIONS_RANGE, parseIntInRange, REVIEW_WINDOW_RANGE } from './contractTerms.ts';
import type { CreateContractPayload } from './services/contractsApi.ts';

test('maxRevisionsPerStage: whole numbers 0..20 pass, as numbers', () => {
  for (const v of ['0', '5', '20', ' 3 ']) assert.equal(parseIntInRange(v, MAX_REVISIONS_RANGE), Number(v.trim()));
});

test('maxRevisionsPerStage: 21, -1, 2.5 and other non-integers are blocked', () => {
  for (const v of ['21', '-1', '2.5', '', ' ', '1e1', 'abc', '3.0']) assert.equal(parseIntInRange(v, MAX_REVISIONS_RANGE), null, v);
});

test('reviewWindowDays: 1..60 only', () => {
  assert.equal(parseIntInRange('1', REVIEW_WINDOW_RANGE), 1);
  assert.equal(parseIntInRange('60', REVIEW_WINDOW_RANGE), 60);
  assert.equal(parseIntInRange('0', REVIEW_WINDOW_RANGE), null);
  assert.equal(parseIntInRange('61', REVIEW_WINDOW_RANGE), null);
});

test('the form starts at 3 revisions, 7 review days', () => {
  assert.equal(MAX_REVISIONS_RANGE.default, 3);
  assert.equal(REVIEW_WINDOW_RANGE.default, 7);
});

const base: CreateContractPayload = {
  totalDesignFee: '50000000',
  maxRevisionsPerStage: 3,
  reviewWindowDays: 7,
  note: 'Scope A',
  milestones: [
    { seqNo: 1, name: 'Deposit', stageType: 'DEPOSIT', amount: '15000000', dueTrigger: 'ON_CONTRACT_ACTIVE' },
    { seqNo: 2, name: 'Layout', stageType: 'LAYOUT_2D', amount: '35000000', dueTrigger: 'ON_STAGE_APPROVED' },
  ],
};
const copy = (): CreateContractPayload => structuredClone(base);

test('PATCH: changing only maxRevisionsPerStage sends only that field, as a number', () => {
  for (const n of [0, 5, 20]) {
    const body = changedTerms(base, { ...copy(), maxRevisionsPerStage: n });
    assert.deepEqual(body, { maxRevisionsPerStage: n });
  }
});

test('PATCH: nothing changed sends an empty body', () => {
  assert.deepEqual(changedTerms(base, copy()), {});
});

test('PATCH: fee and schedule travel together', () => {
  const next = copy();
  next.milestones[1].name = 'Layout 2D';
  const body = changedTerms(base, next);
  assert.deepEqual(Object.keys(body).sort(), ['milestones', 'totalDesignFee']);
});

test('PATCH: a cleared note is sent as null, an untouched one is left out', () => {
  assert.deepEqual(changedTerms(base, { ...copy(), note: undefined }), { note: null });
  assert.deepEqual(changedTerms(base, { ...copy(), note: ' Scope A ' }), {});
});
