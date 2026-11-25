import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedTerms, fixedSchedule, MAX_REVISIONS_RANGE, parseIntInRange, REVIEW_WINDOW_RANGE, rowsFromMilestones, splitAmounts, STAGE_ORDER } from './contractTerms.ts';
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

test('fixedSchedule: always the four stages in order, seqNo 1..4, with the trigger the backend expects', () => {
  const rows = STAGE_ORDER.map((s, i) => ({ name: ` ${s} `, amount: ` ${(i + 1) * 1000} ` }));
  assert.deepEqual(fixedSchedule(rows), [
    { seqNo: 1, name: 'DEPOSIT', stageType: 'DEPOSIT', amount: '1000', dueTrigger: 'ON_CONTRACT_ACTIVE' },
    { seqNo: 2, name: 'LAYOUT_2D', stageType: 'LAYOUT_2D', amount: '2000', dueTrigger: 'ON_STAGE_APPROVED' },
    { seqNo: 3, name: 'RENDER_3D', stageType: 'RENDER_3D', amount: '3000', dueTrigger: 'ON_STAGE_APPROVED' },
    { seqNo: 4, name: 'FINAL_PACKAGE', stageType: 'FINAL_PACKAGE', amount: '4000', dueTrigger: 'ON_STAGE_APPROVED' },
  ]);
});

test('rowsFromMilestones: matches saved milestones by stage, fills a missing stage with its default name and no amount', () => {
  const saved = [
    { stageType: 'DEPOSIT' as const, name: 'Deposit', amount: '10' },
    { stageType: 'FINAL_PACKAGE' as const, name: 'Handover', amount: '30' }, // reordered: saved as seqNo 2
    { stageType: 'LAYOUT_2D' as const, name: 'Layout', amount: '20' },
  ];
  assert.deepEqual(rowsFromMilestones(saved, (s) => `new ${s}`), [
    { name: 'Deposit', amount: '10' },
    { name: 'Layout', amount: '20' },
    { name: 'new RENDER_3D', amount: '' },
    { name: 'Handover', amount: '30' },
  ]);
});

const sumOf = (a: string[]) => a.reduce((n, v) => n + BigInt(v), 0n);

test('splitAmounts: an even fee splits evenly', () => {
  assert.deepEqual(splitAmounts('500000000', ['', '', '', '']), ['125000000', '125000000', '125000000', '125000000']);
});

test('splitAmounts: shares round to 1,000 VND, the leftover goes on the first automatic row, the total always matches', () => {
  for (const fee of ['100000000', '50000001', '7', '1000', '33333333']) {
    const a = splitAmounts(fee, ['', '', '', '']);
    assert.equal(sumOf(a), BigInt(fee), fee);
  }
  assert.deepEqual(splitAmounts('100000000', ['', '', '', '']), ['25000000', '25000000', '25000000', '25000000']);
  assert.deepEqual(splitAmounts('10000000', ['', '', '']), ['3334000', '3333000', '3333000']);
});

test('splitAmounts: typed amounts are kept and the automatic rows share the rest', () => {
  assert.deepEqual(splitAmounts('100000000', ['30000000', '', '', '10000000']), ['30000000', '30000000', '30000000', '10000000']);
  // clearing a typed amount puts the row back on automatic
  assert.deepEqual(splitAmounts('100000000', ['30000000', '', '', '']), ['30000000', '23334000', '23333000', '23333000']);
});

test('splitAmounts: typed amounts over the fee leave 0 for the rest; every row typed or no fee changes nothing', () => {
  assert.deepEqual(splitAmounts('100', ['80', '50', '', '']), ['80', '50', '0', '0']);
  assert.deepEqual(splitAmounts('100', ['10', '20', '30', '30']), ['10', '20', '30', '30']);
  assert.deepEqual(splitAmounts('', ['', '5', '', '']), ['', '5', '', '']);
});
