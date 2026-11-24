// No '@/' runtime imports here: chatErrors.test.ts loads this file with plain `node --test`.

/**
 * The one table of chat error codes → i18n key, for every chat endpoint. Branch on the backend `code`
 * ({ code, message, details }), never on the message text. 401 is not here: apiRequest refreshes the token and retries.
 */
export const CHAT_ERROR_MESSAGES = {
  USER_NOT_FOUND: 'chat.errors.USER_NOT_FOUND',
  CHAT_NOT_ALLOWED: 'chat.errors.CHAT_NOT_ALLOWED',
  CHAT_RECIPIENT_INACTIVE: 'chat.errors.CHAT_RECIPIENT_INACTIVE',
  /** Also when the viewer is not one of the two people: the backend does not tell them apart, neither do we. */
  CONVERSATION_NOT_FOUND: 'chat.errors.CONVERSATION_NOT_FOUND',
  INSUFFICIENT_ROLE: 'chat.errors.INSUFFICIENT_ROLE',
  MESSAGE_CONTENT_REQUIRED: 'chat.errors.MESSAGE_CONTENT_REQUIRED',
  INVALID_CHAT_ATTACHMENT: 'chat.errors.INVALID_CHAT_ATTACHMENT',
  INVALID_MESSAGE_CONTEXT: 'chat.errors.INVALID_MESSAGE_CONTEXT',
  MESSAGE_NOT_FOUND: 'chat.errors.MESSAGE_NOT_FOUND',
  CHAT_ATTACHMENT_NOT_FOUND: 'chat.errors.CHAT_ATTACHMENT_NOT_FOUND',
  USER_BUSY: 'chat.errors.USER_BUSY',
  VIDEO_CALL_NOT_FOUND: 'chat.errors.VIDEO_CALL_NOT_FOUND',
  NOT_VIDEO_CALL_CALLEE: 'chat.errors.NOT_VIDEO_CALL_CALLEE',
  INVALID_VIDEO_CALL_STATUS_TRANSITION: 'chat.errors.INVALID_VIDEO_CALL_STATUS_TRANSITION',
} as const;

/** Unmapped errors: whether "Try again" belongs in the sentence depends on `retryable`. */
const RETRY_KEY = 'chat.errors.retry';
const FAILED_KEY = 'chat.errors.failed';

type MappedCode = keyof typeof CHAT_ERROR_MESSAGES;
const isMapped = (code: string): code is MappedCode => Object.hasOwn(CHAT_ERROR_MESSAGES, code);

export interface ChatError {
  /** Backend code, '' for a network error or a body without one. */
  code: string;
  messageKey: string;
  /**
   * False for a 4xx with a code (BAD_REQUEST, VALIDATION_ERROR, INSUFFICIENT_ROLE, *_NOT_FOUND...): the same request
   * gets the same answer. True for network errors, 5xx (INTERNAL_ERROR) and errors without a code.
   */
  retryable: boolean;
}

export function classifyChatError(error: unknown): ChatError {
  const isObject = typeof error === 'object' && error !== null;
  const rawCode = isObject && 'code' in error ? error.code : undefined;
  const rawStatus = isObject && 'status' in error ? error.status : undefined;
  const code = typeof rawCode === 'string' ? rawCode : '';
  const status = typeof rawStatus === 'number' ? rawStatus : 0;
  const retryable = !(code && status >= 400 && status < 500);
  const messageKey = isMapped(code) ? CHAT_ERROR_MESSAGES[code] : retryable ? RETRY_KEY : FAILED_KEY;
  return { code, messageKey, retryable };
}

// ---------------------------------------------------------------------------
// POST /conversations
// ---------------------------------------------------------------------------

/** 403 / 404 / 422 on open: the contact row is out of date. */
const STALE_CONTACT_CODES: ReadonlySet<string> = new Set(['USER_NOT_FOUND', 'CHAT_NOT_ALLOWED', 'CHAT_RECIPIENT_INACTIVE']);

export interface OpenConversationFailure extends ChatError {
  /** The contact list should be refetched. */
  staleContact: boolean;
  /** 400 VALIDATION_ERROR: participantId was not a UUID, a frontend bug worth logging. */
  clientBug: boolean;
}

export function openConversationFailure(error: unknown): OpenConversationFailure {
  const classified = classifyChatError(error);
  return {
    ...classified,
    staleContact: STALE_CONTACT_CODES.has(classified.code),
    clientBug: classified.code === 'VALIDATION_ERROR',
  };
}

// ---------------------------------------------------------------------------
// POST /conversations/:id/messages
// ---------------------------------------------------------------------------

/** What the composer and the page must do after a failed send. */
export type SendEffect =
  /** 403 CHAT_NOT_ALLOWED / 422 CHAT_RECIPIENT_INACTIVE: the conversation becomes read only right away. */
  | 'blocked'
  /** 422 INVALID_CHAT_ATTACHMENT: drop the file, keep the text. */
  | 'dropFile'
  /** 422 INVALID_MESSAGE_CONTEXT: drop the project, keep text and file. */
  | 'dropContext'
  /** 404 CONVERSATION_NOT_FOUND: the page's not-found flow. */
  | 'notFound'
  | null;

const SEND_EFFECTS: Readonly<Record<string, SendEffect>> = {
  CHAT_NOT_ALLOWED: 'blocked',
  CHAT_RECIPIENT_INACTIVE: 'blocked',
  INVALID_CHAT_ATTACHMENT: 'dropFile',
  INVALID_MESSAGE_CONTEXT: 'dropContext',
  CONVERSATION_NOT_FOUND: 'notFound',
};

export interface SendMessageFailure extends ChatError {
  effect: SendEffect;
  /** 400 VALIDATION_ERROR: the frontend sent something it should have caught. */
  clientBug: boolean;
}

/**
 * Never retried automatically (the backend has no idempotency key). A network error or 5xx may still have saved the
 * message, so the text says so and the user decides whether to send again.
 */
export function sendMessageFailure(error: unknown): SendMessageFailure {
  const classified = classifyChatError(error);
  const { code, retryable } = classified;
  const messageKey = isMapped(code) ? classified.messageKey : retryable ? 'chat.composer.maybeNotSent' : 'chat.composer.failed';
  return {
    ...classified,
    messageKey,
    effect: Object.hasOwn(SEND_EFFECTS, code) ? SEND_EFFECTS[code] ?? null : null,
    clientBug: code === 'VALIDATION_ERROR',
  };
}

// ---------------------------------------------------------------------------
// GET /messages/:id/attachment
// ---------------------------------------------------------------------------

/** Classify an attachment download/preview error. Missing attachments are final (no retry). */
export function attachmentFailure(error: unknown): ChatError {
  const classified = classifyChatError(error);
  const { code, retryable } = classified;
  const messageKey = isMapped(code)
    ? classified.messageKey
    : retryable
      ? 'chat.thread.downloadFailed'
      : 'chat.thread.downloadUnavailable';
  return { ...classified, messageKey };
}

// ---------------------------------------------------------------------------
// Video calls: POST /conversations/:id/video-calls & /video-calls/:id/*
// ---------------------------------------------------------------------------

export interface VideoCallFailure extends ChatError {
  /** 403 CHAT_NOT_ALLOWED / 422 CHAT_RECIPIENT_INACTIVE: conversation is now read-only. */
  blocked: boolean;
  /** 404 CONVERSATION_NOT_FOUND / VIDEO_CALL_NOT_FOUND. */
  notFound: boolean;
  /** 422 INVALID_VIDEO_CALL_STATUS_TRANSITION: the call already changed or ended (e.g. peer hung up first). */
  alreadyEnded: boolean;
  /** 409 USER_BUSY: caller or callee is already in another call. */
  busy: boolean;
}

export function videoCallFailure(error: unknown): VideoCallFailure {
  const classified = classifyChatError(error);
  const { code, retryable } = classified;
  const messageKey = isMapped(code)
    ? classified.messageKey
    : retryable
      ? 'chat.call.errorRetry'
      : 'chat.call.errorFailed';
  return {
    ...classified,
    messageKey,
    blocked: code === 'CHAT_NOT_ALLOWED' || code === 'CHAT_RECIPIENT_INACTIVE',
    notFound: code === 'CONVERSATION_NOT_FOUND' || code === 'VIDEO_CALL_NOT_FOUND',
    alreadyEnded: code === 'INVALID_VIDEO_CALL_STATUS_TRANSITION',
    busy: code === 'USER_BUSY',
  };
}
