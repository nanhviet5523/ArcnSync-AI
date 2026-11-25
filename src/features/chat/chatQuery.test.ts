import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatContactsSearch, conversationsSearch, messagesSearch } from './chatQuery.ts';
import type { GetChatContactsQuery, GetConversationsQuery } from '../../types/chat.ts';

test('conversations: only page and limit, never q, search or projectId', () => {
  const query = { page: 3, limit: 10, q: 'x', search: 'y', projectId: 'p1' } as GetConversationsQuery;
  assert.equal(conversationsSearch(query), '?page=3&limit=10');
  assert.equal(conversationsSearch(), '');
  assert.equal(conversationsSearch({ page: -1, limit: 1000 }), '?limit=100');
});

test('sends only page, limit and q', () => {
  // extra fields can sneak in from a spread object; the backend would answer 400 VALIDATION_ERROR
  const query = { page: 2, limit: 20, q: 'linh', projectId: 'p1', search: 'x' } as GetChatContactsQuery;
  const params = new URLSearchParams(chatContactsSearch(query));
  assert.deepEqual([...params.keys()], ['page', 'limit', 'q']);
  assert.equal(chatContactsSearch(query), '?page=2&limit=20&q=linh');
});

test('no params at all when nothing is set', () => {
  assert.equal(chatContactsSearch(), '');
  assert.equal(chatContactsSearch({ q: '   ' }), '');
});

test('values the backend would reject are dropped or clamped', () => {
  assert.equal(chatContactsSearch({ page: 0, limit: 500 }), '?limit=100');
  assert.equal(chatContactsSearch({ page: 1.7, limit: -3 }), '?page=1');
  assert.equal(chatContactsSearch({ q: `  ${'a'.repeat(120)}  ` }), `?q=${'a'.repeat(100)}`);
});

test('q is encoded', () => {
  assert.equal(chatContactsSearch({ q: 'Nguyễn & Co' }), '?q=Nguy%E1%BB%85n+%26+Co');
});

test('messagesSearch: before only when it is a UUID', () => {
  const id = '3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c';
  assert.equal(messagesSearch({ before: id }), `?before=${id}`);
  assert.equal(messagesSearch({ before: 'abc' }), '');
  assert.equal(messagesSearch({ before: '' }), '');
});

test('messagesSearch: limit clamped to 1..100, no "?" without params, unknown keys dropped', () => {
  assert.equal(messagesSearch({ limit: 0 }), '?limit=1');
  assert.equal(messagesSearch({ limit: 500 }), '?limit=100');
  assert.equal(messagesSearch({ limit: 30 }), '?limit=30');
  assert.equal(messagesSearch({}), '');
  assert.equal(messagesSearch(), '');
  assert.equal(messagesSearch({ limit: Number.NaN }), '');
  const extra = { limit: 20, page: 2 };
  assert.equal(messagesSearch(extra), '?limit=20');
});
