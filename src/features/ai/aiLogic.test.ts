import { test } from 'node:test';
import assert from 'node:assert/strict';
import { en } from '../../i18n/en.ts';
import type { AiMessage, AiStreamEvent } from './aiApi.ts';
import {
  AI_ERROR_MESSAGES, AI_GENERIC_KEY, AI_NETWORK_KEY, AI_TOO_FAST_KEY,
  advanceTurn, applyStreamEvent, classifyAiError, failTurn, startTurn,
} from './aiLogic.ts';
import type { StreamTurn } from './aiLogic.ts';

const apiError = (code: string, status: number) => Object.assign(new Error('Thông điệp tiếng Việt'), { name: 'ApiError', code, status });
/** What aiApi.sendMessage throws for an SSE `error` event: a code, no HTTP status. */
const sseError = (code: string) => Object.assign(new Error('x'), { code });

const lookup = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);

// --- classifyAiError ---------------------------------------------------------

test('every AI error key has English copy', () => {
  for (const key of [...Object.values(AI_ERROR_MESSAGES), AI_TOO_FAST_KEY, AI_NETWORK_KEY, AI_GENERIC_KEY]) {
    assert.equal(typeof lookup(key), 'string', key);
  }
});

test('404 AI_CONVERSATION_NOT_FOUND: drop the conversation and reload the list', () => {
  assert.deepEqual(classifyAiError(apiError('AI_CONVERSATION_NOT_FOUND', 404)), {
    code: 'AI_CONVERSATION_NOT_FOUND', messageKey: 'ai.errors.AI_CONVERSATION_NOT_FOUND', action: 'deselect', known: true,
  });
});

test('422 PROJECT_CLOSED locks the page, 422 AI_QUOTA_EXCEEDED locks sending', () => {
  assert.equal(classifyAiError(apiError('PROJECT_CLOSED', 422)).action, 'closed');
  assert.equal(classifyAiError(apiError('PROJECT_CLOSED', 422)).messageKey, 'ai.errors.PROJECT_CLOSED');
  assert.equal(classifyAiError(apiError('AI_QUOTA_EXCEEDED', 422)).action, 'quota');
  assert.equal(classifyAiError(apiError('AI_QUOTA_EXCEEDED', 422)).messageKey, 'ai.errors.AI_QUOTA_EXCEEDED');
});

test('503 AI not configured: one "not available" sentence for both codes', () => {
  for (const code of ['AI_PROVIDER_NOT_CONFIGURED', 'AI_PROMPT_NOT_CONFIGURED']) {
    assert.deepEqual(classifyAiError(apiError(code, 503)), { code, messageKey: 'ai.errors.unavailable', action: 'none', known: true });
  }
});

test('429 throttle: "too fast", with or without a code', () => {
  assert.equal(classifyAiError(apiError('', 429)).messageKey, AI_TOO_FAST_KEY);
  assert.equal(classifyAiError(apiError('TOO_MANY_REQUESTS', 429)).messageKey, AI_TOO_FAST_KEY);
});

test('SSE error AI_PROVIDER_ERROR: its own message, retry allowed', () => {
  assert.deepEqual(classifyAiError(sseError('AI_PROVIDER_ERROR')), {
    code: 'AI_PROVIDER_ERROR', messageKey: 'ai.errors.AI_PROVIDER_ERROR', action: 'none', known: true,
  });
});

test('network error, unknown code, our own error: no HTTP status or backend text shown', () => {
  assert.equal(classifyAiError(apiError('', 0)).messageKey, AI_NETWORK_KEY);
  assert.deepEqual(classifyAiError(apiError('SOMETHING_NEW', 500)), { code: 'SOMETHING_NEW', messageKey: AI_GENERIC_KEY, action: 'none', known: false });
  assert.equal(classifyAiError(new Error('The AI stream ended early.')).messageKey, AI_GENERIC_KEY);
  assert.equal(classifyAiError(null).messageKey, AI_GENERIC_KEY);
});

// --- stream turn -------------------------------------------------------------

const saved = (id: string, role: AiMessage['role'], content: string): AiMessage => ({
  id, conversationId: 'c1', role, content, products: [], createdAt: '2026-11-27T00:00:00.000Z',
});

/** Runs events through the turn the way the page does. */
function run(events: AiStreamEvent[]) {
  const older = saved('m0', 'ASSISTANT', 'Earlier answer');
  const started = startTurn('c1', 'Which sofa fits?', 1000);
  let turn: StreamTurn = started.turn;
  let messages = [older, started.message];
  for (const event of events) {
    messages = applyStreamEvent(messages, turn, event);
    turn = advanceTurn(turn, event);
  }
  return { messages, turn, tempUserId: started.turn.userId };
}

test('stream: message → delta → products → done ends with the two saved messages', () => {
  const answer = saved('m2', 'ASSISTANT', 'Try the 2.4 m sofa.');
  const { messages, turn } = run([
    { event: 'message', data: saved('m1', 'USER', 'Which sofa fits?') },
    { event: 'status', data: { kind: 'SEARCHING_PRODUCTS' } },
    { event: 'delta', data: { text: 'Try the ' } },
    { event: 'delta', data: { text: '2.4 m sofa.' } },
    { event: 'products', data: { items: [] } },
    { event: 'done', data: { message: answer, generationId: 'g', usage: { inputTokens: 1, outputTokens: 1 }, quota: { limit: 10, used: 1 } } },
  ]);
  assert.deepEqual(messages.map((m) => m.id), ['m0', 'm1', 'm2']);
  assert.equal(turn.done, true);
});

test('error after `message`: the saved question stays, only the half-written answer goes', () => {
  const { messages, turn } = run([
    { event: 'message', data: saved('m1', 'USER', 'Which sofa fits?') },
    { event: 'delta', data: { text: 'Try the' } },
  ]);
  assert.equal(turn.userSaved, true);
  assert.equal(turn.userId, 'm1');
  assert.deepEqual(messages.map((m) => m.content), ['Earlier answer', 'Which sofa fits?', 'Try the']);
  const after = failTurn(messages, turn);
  assert.deepEqual(after.map((m) => m.id), ['m0', 'm1']);
});

test('error before `message` (HTTP error, no stream): the temporary question goes too', () => {
  const { messages, turn, tempUserId } = run([]);
  assert.ok(messages.some((m) => m.id === tempUserId));
  assert.deepEqual(failTurn(messages, turn).map((m) => m.id), ['m0']);
});
