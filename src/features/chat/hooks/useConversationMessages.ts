import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import type { ChatMessageSummary } from '@/types/chat';
import { chatApi } from '../chatApi';
import { classifyChatError } from '../chatErrors';
import { appendMessage as appendTo, mergeFirstPage, olderCursor, prependOlder } from '../messageList';

const PAGE_SIZE = 30;

type Op = 'first' | 'older';

/** Everything is tied to `convId`: an answer for another conversation is never applied. */
interface ThreadState {
  convId: string | undefined;
  /** Display order: oldest → newest. */
  messages: ChatMessageSummary[];
  /** From the latest page loaded at the old end. */
  hasMore: boolean;
  loading: boolean;
  loadingOlder: boolean;
  error: string;
  failedOp: Op | null;
  retryable: boolean;
}

const EMPTY: ThreadState = {
  convId: undefined, messages: [], hasMore: false, loading: false, loadingOlder: false, error: '', failedOp: null, retryable: false,
};

export interface ConversationMessages {
  messages: ChatMessageSummary[];
  /** Latest page on its way (first load, or after a cursor reset). */
  loading: boolean;
  /** An older page on its way. */
  loadingOlder: boolean;
  hasMore: boolean;
  error: string;
  /** Load the page before the oldest message held. Ignored while anything is loading or when hasMore is false. */
  loadOlder: () => void;
  /** Present only when trying again may help; repeats the fetch that failed (latest page or older page). */
  retry?: () => void;
  /** Add a message at the end (realtime message.created, a message just sent). Skipped when already there. */
  appendMessage: (message: ChatMessageSummary) => void;
}

/**
 * The messages of one conversation (GET /conversations/:id/messages, cursor paging). Changing `conversationId` aborts
 * what is in flight and starts over; late answers of the previous conversation are dropped. A 404 calls `onNotFound`.
 */
export function useConversationMessages(conversationId: string | undefined, onNotFound: () => void): ConversationMessages {
  const [state, setState] = useState<ThreadState>(EMPTY);
  const activeId = useRef(conversationId);
  const stateRef = useRef(state);
  const firstCtl = useRef<AbortController | null>(null);
  const olderCtl = useRef<AbortController | null>(null);
  /** One silent reset per conversation after INVALID_MESSAGE_CURSOR; a second one is shown as an error. */
  const cursorResetDone = useRef(false);
  const notFoundRef = useRef(onNotFound);
  useEffect(() => { notFoundRef.current = onNotFound; });
  useEffect(() => { stateRef.current = state; });

  /** Apply `fn` only while `convId` is still the open conversation. */
  const patch = (convId: string, fn: (s: ThreadState) => ThreadState) =>
    setState((s) => (s.convId === convId && activeId.current === convId ? fn(s) : s));

  const fail = (convId: string, op: Op, e: unknown) => {
    const { code, messageKey, retryable } = classifyChatError(e);
    if (code === 'CONVERSATION_NOT_FOUND') {
      notFoundRef.current();
      return;
    }
    if (code === 'VALIDATION_ERROR') console.error('GET /conversations/:id/messages rejected the query', convId, e);
    patch(convId, (s) => ({ ...s, loading: false, loadingOlder: false, error: t(messageKey), failedOp: op, retryable }));
  };

  /**
   * Latest page. Messages appended while it loads (sent, realtime) are merged after it, not overwritten.
   * `discard`: after INVALID_MESSAGE_CURSOR the old state is wrong, so nothing of it is kept.
   */
  const loadFirst = async (convId: string, discard = false) => {
    if (activeId.current !== convId) return;
    olderCtl.current?.abort();
    firstCtl.current?.abort();
    const controller = new AbortController();
    firstCtl.current = controller;
    setState((s) => (s.convId === convId
      ? { ...s, messages: [], hasMore: false, loading: true, loadingOlder: false, error: '', failedOp: null }
      : { ...EMPTY, convId, loading: true }));
    try {
      const page = await chatApi.getMessages(convId, { limit: PAGE_SIZE }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      patch(convId, (s) => ({ ...s, messages: mergeFirstPage(discard ? [] : s.messages, page.items), hasMore: page.hasMore, loading: false }));
    } catch (e) {
      if (controller.signal.aborted) return;
      fail(convId, 'first', e);
    } finally {
      if (firstCtl.current === controller) firstCtl.current = null;
    }
  };

  const loadOlder = async () => {
    const convId = activeId.current;
    const s = stateRef.current;
    if (!convId || s.convId !== convId || s.loading || s.loadingOlder || !s.hasMore || olderCtl.current || firstCtl.current) return;
    const before = olderCursor(s.messages);
    if (!before) return;

    const controller = new AbortController();
    olderCtl.current = controller;
    patch(convId, (prev) => ({ ...prev, loadingOlder: true, error: '', failedOp: null }));
    try {
      const page = await chatApi.getMessages(convId, { before, limit: PAGE_SIZE }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      patch(convId, (prev) => ({ ...prev, messages: prependOlder(prev.messages, page.items), hasMore: page.hasMore, loadingOlder: false }));
    } catch (e) {
      if (controller.signal.aborted) return;
      if (classifyChatError(e).code === 'INVALID_MESSAGE_CURSOR' && !cursorResetDone.current) {
        // The cursor is not a message of this conversation: frontend state went wrong. Start over without `before`.
        cursorResetDone.current = true;
        console.error('INVALID_MESSAGE_CURSOR: reloading the thread from the latest page', convId, before);
        if (olderCtl.current === controller) olderCtl.current = null;
        void loadFirst(convId, true);
        return;
      }
      fail(convId, 'older', e);
    } finally {
      if (olderCtl.current === controller) olderCtl.current = null;
    }
  };

  useEffect(() => {
    activeId.current = conversationId;
    cursorResetDone.current = false;
    if (conversationId) void Promise.resolve().then(() => loadFirst(conversationId));
    return () => {
      firstCtl.current?.abort();
      olderCtl.current?.abort();
      firstCtl.current = null;
      olderCtl.current = null;
    };
    // loadFirst reads refs only; the thread restarts when the conversation changes, nothing else.
  }, [conversationId]);

  // Before the effect above has run for a new id, never show the previous conversation's messages.
  const current = state.convId === conversationId && conversationId ? state : { ...EMPTY, loading: !!conversationId };
  const failedOp = current.failedOp;

  return {
    messages: current.messages,
    loading: current.loading,
    loadingOlder: current.loadingOlder,
    hasMore: current.hasMore,
    error: current.error,
    loadOlder: () => { void loadOlder(); },
    retry: current.error && current.retryable && failedOp && conversationId
      ? () => { void (failedOp === 'older' ? loadOlder() : loadFirst(conversationId)); }
      : undefined,
    appendMessage: (message) => patch(message.conversationId, (s) => ({ ...s, messages: appendTo(s.messages, message) })),
  };
}
