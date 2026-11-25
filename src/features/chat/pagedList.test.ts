import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendUnique, applyLocalUpdate, moveToTop, replaceItem, retryPage } from './pagedList.ts';

type Row = { id: string; v?: number };
const key = (r: Row) => r.id;
const ids = (rows: Row[]) => rows.map((r) => r.id);

test('page 2 repeating an item of page 1: [a,b,c] + [c,d] → [a,b,c,d]', () => {
  const page1 = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(ids(appendUnique(page1, [{ id: 'c' }, { id: 'd' }], key)), ['a', 'b', 'c', 'd']);
});

test('the copy already shown wins over the repeated one', () => {
  const merged = appendUnique([{ id: 'c', v: 1 }], [{ id: 'c', v: 2 }], key);
  assert.deepEqual(merged, [{ id: 'c', v: 1 }]);
});

test('duplicates inside one page are dropped too, order kept', () => {
  assert.deepEqual(ids(appendUnique([], [{ id: 'x' }, { id: 'y' }, { id: 'x' }], key)), ['x', 'y']);
});

test('does not mutate the previous list', () => {
  const prev = [{ id: 'a' }];
  appendUnique(prev, [{ id: 'b' }], key);
  assert.deepEqual(ids(prev), ['a']);
});

test('failed reload → retry asks for the first page again, not page + 1', () => {
  // 3 pages loaded, then a reload failed: items are still there and page is still 3.
  assert.equal(retryPage('reload', 1, 3), 1);
  assert.equal(retryPage('reload', 2, 3), 2);
});

test('failed "load more" → retry asks for page + 1', () => {
  assert.equal(retryPage('more', 1, 3), 4);
});

test('moveToTop: a loaded conversation goes first, once', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const updated = { id: 'c', v: 2 };
  const next = moveToTop(list, updated);
  assert.deepEqual(next.map((x) => x.id), ['c', 'a', 'b']);
  assert.equal(next[0], updated);
  assert.deepEqual(list.map((x) => x.id), ['a', 'b', 'c']);
});

test('moveToTop: a conversation not loaded yet is inserted at the top', () => {
  assert.deepEqual(moveToTop([{ id: 'a' }, { id: 'b' }], { id: 'z' }).map((x) => x.id), ['z', 'a', 'b']);
  assert.deepEqual(moveToTop([], { id: 'z' }).map((x) => x.id), ['z']);
});

test('replaceItem keeps the position', () => {
  assert.deepEqual(replaceItem([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], { id: 'b', v: 2 }), [{ id: 'a', v: 1 }, { id: 'b', v: 2 }]);
  assert.deepEqual(replaceItem([{ id: 'a', v: 1 }], { id: 'z', v: 2 }), [{ id: 'a', v: 1 }]);
});

test('applyLocalUpdate: inserting a conversation not loaded raises total by one', () => {
  const next = applyLocalUpdate({ items: [{ id: 'a' }, { id: 'b' }], total: 10 }, (items) => moveToTop(items, { id: 'z' }), key);
  assert.deepEqual(ids(next.items), ['z', 'a', 'b']);
  assert.equal(next.total, 11);
});

test('applyLocalUpdate: moving or replacing a loaded one leaves total alone', () => {
  const list: { items: Row[]; total: number } = { items: [{ id: 'a' }, { id: 'b' }], total: 10 };
  assert.equal(applyLocalUpdate(list, (items) => moveToTop(items, { id: 'b' }), key).total, 10);
  assert.equal(applyLocalUpdate(list, (items) => replaceItem(items, { id: 'a', v: 2 }), key).total, 10);
});

test('applyLocalUpdate: counts only new keys, several at once; does not touch the input', () => {
  const list = { items: [{ id: 'a' }], total: 1 };
  const next = applyLocalUpdate(list, (items) => [{ id: 'x' }, { id: 'y' }, ...items], key);
  assert.equal(next.total, 3);
  assert.deepEqual(ids(list.items), ['a']);
  assert.equal(list.total, 1);
});
