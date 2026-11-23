import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ConversationItem } from '../../types/chat.ts';
import { chatCache } from './chatCache.ts';
import { CHAT_ERROR_MESSAGES, classifyChatError, openConversationFailure } from './chatErrors.ts';

const apiError = (code: string, status: number) => Object.assign(new Error('x'), { name: 'ApiError', code, status });
const RETRY = 'chat.errors.retry';
const FAILED = 'chat.errors.failed';

// --- classifyChatError -------------------------------------------------------

test('404 CONVERSATION_NOT_FOUND: own message, no retry', () => {
  assert.deepEqual(classifyChatError(apiError('CONVERSATION_NOT_FOUND', 404)), {
    code: 'CONVERSATION_NOT_FOUND', messageKey: CHAT_ERROR_MESSAGES.CONVERSATION_NOT_FOUND, retryable: false,
  });
});

test('400 BAD_REQUEST (ParseUUIDPipe): generic message without "try again", no retry', () => {
  assert.deepEqual(classifyChatError(apiError('BAD_REQUEST', 400)), { code: 'BAD_REQUEST', messageKey: FAILED, retryable: false });
});

test('403 INSUFFICIENT_ROLE: no-access message, no retry', () => {
  assert.deepEqual(classifyChatError(apiError('INSUFFICIENT_ROLE', 403)), {
    code: 'INSUFFICIENT_ROLE', messageKey: CHAT_ERROR_MESSAGES.INSUFFICIENT_ROLE, retryable: false,
  });
});

test('every 4xx with a code is final, mapped or not', () => {
  for (const [code, status] of [['VALIDATION_ERROR', 400], ['SOMETHING_NEW', 409], ['CHAT_NOT_ALLOWED', 403]] as const) {
    assert.equal(classifyChatError(apiError(code, status)).retryable, false, code);
  }
});

test('network errors (TypeError, ApiError without code or status) are retryable', () => {
  for (const e of [new TypeError('Failed to fetch'), apiError('', 0), null, 'oops']) {
    assert.deepEqual(classifyChatError(e), { code: '', messageKey: RETRY, retryable: true });
  }
});

test('500 INTERNAL_ERROR and other 5xx are retryable', () => {
  assert.deepEqual(classifyChatError(apiError('INTERNAL_ERROR', 500)), { code: 'INTERNAL_ERROR', messageKey: RETRY, retryable: true });
  assert.equal(classifyChatError(apiError('', 503)).retryable, true);
});

test('branches on code, not on message text, and ignores inherited keys', () => {
  assert.equal(classifyChatError({ code: 'toString', status: 404, message: 'CONVERSATION_NOT_FOUND' }).messageKey, FAILED);
  assert.equal(classifyChatError({ code: 42 }).code, '');
});

// --- openConversationFailure (reuses classifyChatError) ----------------------

test('open: 403 / 404 / 422 → own message, contact list stale, no retry', () => {
  for (const [code, status] of [['CHAT_NOT_ALLOWED', 403], ['USER_NOT_FOUND', 404], ['CHAT_RECIPIENT_INACTIVE', 422]] as const) {
    assert.deepEqual(openConversationFailure(apiError(code, status)), {
      code, messageKey: CHAT_ERROR_MESSAGES[code], retryable: false, staleContact: true, clientBug: false,
    });
  }
});

test('open: VALIDATION_ERROR is a frontend bug, logged, contacts untouched, no retry', () => {
  assert.deepEqual(openConversationFailure(apiError('VALIDATION_ERROR', 400)), {
    code: 'VALIDATION_ERROR', messageKey: FAILED, retryable: false, staleContact: false, clientBug: true,
  });
});

test('open: network and 5xx → retry, contacts untouched', () => {
  for (const e of [new TypeError('Failed to fetch'), apiError('INTERNAL_ERROR', 500)]) {
    const f = openConversationFailure(e);
    assert.equal(f.retryable, true);
    assert.equal(f.staleContact, false);
    assert.equal(f.clientBug, false);
  }
});

// --- chatCache ----------------------------------------------------------------

test('chatCache stores conversations and notifies only the invalidated lists', () => {
  chatCache.clear();
  const conv = { id: 'c1', lastMessage: null } as unknown as ConversationItem;
  chatCache.setConversation(conv);
  assert.equal(chatCache.getConversation('c1'), conv);
  assert.equal(chatCache.getConversation(undefined), undefined);

  const calls: string[] = [];
  const offContacts = chatCache.subscribe('chat-contacts', () => calls.push('contacts'));
  const offConversations = chatCache.subscribe('conversations', () => calls.push('conversations'));
  chatCache.invalidate('chat-contacts');
  chatCache.invalidate('chat-contacts', 'conversations');
  assert.deepEqual(calls, ['contacts', 'contacts', 'conversations']);

  offContacts();
  offConversations();
  chatCache.invalidate('chat-contacts', 'conversations');
  assert.equal(calls.length, 3);
});
