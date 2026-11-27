// No '@/' runtime imports here: aiLogic.test.ts loads this file with plain `node --test`.
import type { AiMessage, AiStreamEvent } from './aiApi';

/**
 * AI chat error codes → i18n key. Branch on the backend `code` ({ code, message, details }), never on the message,
 * and never show the HTTP status. 429 is matched on the status: the throttle may answer without an AI code.
 */
export const AI_ERROR_MESSAGES = {
  AI_CONVERSATION_NOT_FOUND: 'ai.errors.AI_CONVERSATION_NOT_FOUND',
  PROJECT_CLOSED: 'ai.errors.PROJECT_CLOSED',
  AI_QUOTA_EXCEEDED: 'ai.errors.AI_QUOTA_EXCEEDED',
  AI_PROVIDER_NOT_CONFIGURED: 'ai.errors.unavailable',
  AI_PROMPT_NOT_CONFIGURED: 'ai.errors.unavailable',
  /** SSE `error` mid-answer: the model failed, the request is not counted. */
  AI_PROVIDER_ERROR: 'ai.errors.AI_PROVIDER_ERROR',
  INSUFFICIENT_ROLE: 'ai.errors.INSUFFICIENT_ROLE',
} as const;

export const AI_TOO_FAST_KEY = 'ai.errors.tooFast';
export const AI_NETWORK_KEY = 'ai.errors.network';
export const AI_GENERIC_KEY = 'ai.errors.generic';

/**
 * What the page does besides showing the message: drop the conversation and reload the list (deselect),
 * lock sending and New chat (closed), lock sending (quota).
 */
export type AiErrorAction = 'deselect' | 'closed' | 'quota' | 'none';

export interface AiError {
  /** Backend code, '' when there is none (network error, an error of our own). */
  code: string;
  messageKey: string;
  action: AiErrorAction;
  /** False for a code this table doesn't know: the caller logs it. */
  known: boolean;
}

const ACTIONS: Partial<Record<string, AiErrorAction>> = {
  AI_CONVERSATION_NOT_FOUND: 'deselect',
  PROJECT_CLOSED: 'closed',
  AI_QUOTA_EXCEEDED: 'quota',
};

const isMapped = (code: string): code is keyof typeof AI_ERROR_MESSAGES => Object.hasOwn(AI_ERROR_MESSAGES, code);

export function classifyAiError(error: unknown): AiError {
  const e = (typeof error === 'object' && error !== null ? error : {}) as { name?: unknown; code?: unknown; status?: unknown };
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : 0;
  if (status === 429) return { code, messageKey: AI_TOO_FAST_KEY, action: 'none', known: true };
  if (isMapped(code)) return { code, messageKey: AI_ERROR_MESSAGES[code], action: ACTIONS[code] ?? 'none', known: true };
  // the request never reached the server
  if (e.name === 'ApiError' && !code && !status) return { code, messageKey: AI_NETWORK_KEY, action: 'none', known: true };
  return { code, messageKey: AI_GENERIC_KEY, action: 'none', known: false };
}

/** One question being answered: the temporary ids on screen until the server's messages replace them. */
export interface StreamTurn {
  conversationId: string;
  /** Temporary id, then the saved message's id once `message` arrives. */
  userId: string;
  assistantId: string;
  /** `message` arrived: the question is saved on the server and stays in the thread whatever happens next. */
  userSaved: boolean;
  /** `done` arrived. */
  done: boolean;
}

export function startTurn(conversationId: string, content: string, now = Date.now()): { turn: StreamTurn; message: AiMessage } {
  const turn: StreamTurn = { conversationId, userId: `pending-user-${now}`, assistantId: `pending-assistant-${now}`, userSaved: false, done: false };
  return { turn, message: { id: turn.userId, conversationId, role: 'USER', content, products: [], createdAt: new Date(now).toISOString() } };
}

const assistantDraft = (turn: StreamTurn, patch: Partial<AiMessage>): AiMessage => ({
  id: turn.assistantId, conversationId: turn.conversationId, role: 'ASSISTANT', content: '', products: [], createdAt: new Date().toISOString(), ...patch,
});

/** The turn after an event; pass the turn from BEFORE the event to applyStreamEvent. */
export function advanceTurn(turn: StreamTurn, event: AiStreamEvent): StreamTurn {
  if (event.event === 'message') return { ...turn, userId: event.data.id, userSaved: true };
  if (event.event === 'done') return { ...turn, done: true };
  return turn;
}

/** Applies one SSE event to the thread (`status` and `error` change nothing here: the page handles them). */
export function applyStreamEvent(messages: AiMessage[], turn: StreamTurn, event: AiStreamEvent): AiMessage[] {
  const has = messages.some((m) => m.id === turn.assistantId);
  switch (event.event) {
    case 'message':
      return messages.map((m) => (m.id === turn.userId ? event.data : m));
    case 'delta':
      return has
        ? messages.map((m) => (m.id === turn.assistantId ? { ...m, content: m.content + event.data.text } : m))
        : [...messages, assistantDraft(turn, { content: event.data.text })];
    case 'products':
      return has
        ? messages.map((m) => (m.id === turn.assistantId ? { ...m, products: event.data.items } : m))
        : [...messages, assistantDraft(turn, { products: event.data.items })];
    case 'done':
      return has ? messages.map((m) => (m.id === turn.assistantId ? event.data.message : m)) : [...messages, event.data.message];
    default:
      return messages;
  }
}

/**
 * The answer failed. The half-written answer goes; the question stays once the server saved it (`message` arrived),
 * so the error and "Try again" sit under it. Before that (an HTTP error, not a stream) the temporary question goes too.
 */
export function failTurn(messages: AiMessage[], turn: StreamTurn): AiMessage[] {
  return messages.filter((m) => m.id !== turn.assistantId && (turn.userSaved || m.id !== turn.userId));
}
