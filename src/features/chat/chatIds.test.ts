import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversationPath, isUuid } from './chatIds.ts';

test('isUuid accepts a UUID, in any case', () => {
  assert.equal(isUuid('3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c'), true);
  assert.equal(isUuid('3F2B8C1E-9A4D-4E7B-8C2A-1D5E6F7A8B9C'), true);
});

test('isUuid rejects empty, junk, extra characters and missing values', () => {
  for (const id of ['', 'abc', '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9cX', ' 3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c',
    '3f2b8c1e9a4d4e7b8c2a1d5e6f7a8b9c', '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9g', null, undefined]) {
    assert.equal(isUuid(id), false, String(id));
  }
});

test('conversationPath encodes the id', () => {
  assert.equal(conversationPath('a b/c'), '/messages?c=a%20b%2Fc');
});
