import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendMessage, firstPage, mergeFirstPage, mergeLatestPage, olderCursor, prependOlder } from './messageList.ts';

const m = (id: string, v = 0) => ({ id, v });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

test('first page [m5,m4,m3] (newest first) → shown [m3,m4,m5], cursor m3', () => {
  const shown = firstPage([m('m5'), m('m4'), m('m3')]);
  assert.deepEqual(ids(shown), ['m3', 'm4', 'm5']);
  assert.equal(olderCursor(shown), 'm3');
});

test('older page [m2,m1] goes in front → [m1..m5], cursor m1', () => {
  const shown = prependOlder(firstPage([m('m5'), m('m4'), m('m3')]), [m('m2'), m('m1')]);
  assert.deepEqual(ids(shown), ['m1', 'm2', 'm3', 'm4', 'm5']);
  assert.equal(olderCursor(shown), 'm1');
});

test('cursor is the oldest held, never the last item of the response', () => {
  const page = [m('m5'), m('m4'), m('m3')];
  assert.notEqual(olderCursor(firstPage(page)), page[0].id);
  assert.equal(olderCursor([]), undefined);
});

test('a page repeating messages already held adds no duplicate; the held copy wins', () => {
  const shown = firstPage([m('m4', 1), m('m3', 1)]);
  const next = prependOlder(shown, [m('m3', 2), m('m2', 2)]);
  assert.deepEqual(ids(next), ['m2', 'm3', 'm4']);
  assert.equal(next.find((x) => x.id === 'm3')?.v, 1);
  assert.deepEqual(ids(firstPage([m('a'), m('a'), m('b')])), ['b', 'a']);
});

test('same-timestamp messages keep the backend order, only reversed (no re-sort)', () => {
  const page = [{ id: 'z', createdAt: 't' }, { id: 'a', createdAt: 't' }];
  assert.deepEqual(ids(firstPage(page)), ['a', 'z']);
});

test('appendMessage: a message already there is not added, a new one goes last', () => {
  const shown = firstPage([m('m2'), m('m1')]);
  assert.deepEqual(ids(appendMessage(shown, m('m2', 9))), ['m1', 'm2']);
  assert.equal(appendMessage(shown, m('m2', 9))[1].v, 0);
  assert.deepEqual(ids(appendMessage(shown, m('m3'))), ['m1', 'm2', 'm3']);
});

test('helpers never mutate their input', () => {
  const shown = [m('m1')];
  prependOlder(shown, [m('m0')]);
  appendMessage(shown, m('m2'));
  assert.deepEqual(ids(shown), ['m1']);
});

test('mergeFirstPage: nothing held → just the page in display order', () => {
  assert.deepEqual(ids(mergeFirstPage([], [m('m3'), m('m2'), m('m1')])), ['m1', 'm2', 'm3']);
});

test('mergeFirstPage: a message sent while the page loaded stays, after the page', () => {
  assert.deepEqual(ids(mergeFirstPage([m('m4')], [m('m3'), m('m2'), m('m1')])), ['m1', 'm2', 'm3', 'm4']);
});

test('mergeFirstPage: a held message the page also has shows once', () => {
  assert.deepEqual(ids(mergeFirstPage([m('m3')], [m('m3'), m('m2'), m('m1')])), ['m1', 'm2', 'm3']);
  assert.deepEqual(ids(mergeFirstPage([m('m3'), m('m5'), m('m4')], [m('m3'), m('m2')])), ['m2', 'm3', 'm5', 'm4']);
});

test('mergeLatestPage: older pages stay in front, missed messages join the end', () => {
  // Held m1..m4 (m1, m2 from "load more"); while offline m5, m6 arrived. Latest page (limit 3): m6, m5, m4.
  const r = mergeLatestPage([m('m1'), m('m2'), m('m3'), m('m4')], [m('m6'), m('m5'), m('m4')]);
  assert.deepEqual(ids(r.messages), ['m1', 'm2', 'm3', 'm4', 'm5', 'm6']);
  assert.equal(r.contiguous, true);
});

test('mergeLatestPage: the page copy replaces the held one; a message added during the wait stays last', () => {
  const r = mergeLatestPage([m('m1'), m('m2', 0), m('m9')], [m('m3'), m('m2', 1)]);
  assert.deepEqual(r.messages, [m('m1'), m('m2', 1), m('m3'), m('m9')]);
});

test('mergeLatestPage: no overlap (more than one page missed) → only the page, not contiguous', () => {
  const r = mergeLatestPage([m('m1'), m('m2')], [m('m9'), m('m8')]);
  assert.deepEqual(ids(r.messages), ['m8', 'm9']);
  assert.equal(r.contiguous, false);
});
