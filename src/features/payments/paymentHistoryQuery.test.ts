/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPaymentHistoryQuery, clampedPage, totalPages } from './paymentHistoryQuery.ts';

const UUID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';

test('buildPaymentHistoryQuery: "All" filter sends no status key', () => {
  assert.equal(buildPaymentHistoryQuery({ page: 1, limit: 20, status: '' }), '?page=1&limit=20');
  assert.equal(buildPaymentHistoryQuery({ page: 1, limit: 20, status: null }), '?page=1&limit=20');
  assert.equal(buildPaymentHistoryQuery({ page: 1, limit: 20, status: 'ALL' as never }), '?page=1&limit=20');
});

test('buildPaymentHistoryQuery: keeps valid status and projectId', () => {
  assert.equal(
    buildPaymentHistoryQuery({ page: 2, limit: 1, status: 'SUCCESS', projectId: UUID }),
    `?page=2&limit=1&status=SUCCESS&projectId=${UUID}`,
  );
});

test('buildPaymentHistoryQuery: drops empty / "undefined" / "null" / invalid projectId', () => {
  for (const projectId of ['', '  ', 'undefined', 'null', 'abc', null, undefined]) {
    assert.equal(buildPaymentHistoryQuery({ projectId }), '');
  }
});

test('buildPaymentHistoryQuery: drops out-of-range page/limit and never adds other keys', () => {
  assert.equal(buildPaymentHistoryQuery({ page: 0, limit: 101 }), '');
  assert.equal(buildPaymentHistoryQuery({ page: 1.5, limit: 0 }), '');
  const extra = { page: 1, sort: 'createdAt', q: 'x', _t: 1 } as never;
  assert.equal(buildPaymentHistoryQuery(extra), '?page=1');
});

test('totalPages and clampedPage', () => {
  assert.equal(totalPages(0, 20), 0);
  assert.equal(totalPages(41, 20), 3);
  assert.equal(clampedPage(5, 41, 20), 3);
  assert.equal(clampedPage(3, 41, 20), null);
  assert.equal(clampedPage(4, 0, 20), null);
});
