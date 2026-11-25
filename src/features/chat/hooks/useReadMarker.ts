import { useCallback, useEffect, useRef } from 'react';
import { getCurrentUser } from '@/services/authService';
import type { ChatMessageSummary, ConversationItem, ReadMarkerResponse } from '@/types/chat';
import { chatApi } from '../chatApi';
import { classifyChatError } from '../chatErrors';
import { shouldMarkConversationRead } from '../readMarker';

interface UseReadMarkerOptions {
  conversation: ConversationItem | undefined;
  /** Newest message currently in the thread (messages[messages.length - 1]). */
  latestMessage: ChatMessageSummary | undefined;
  /** Called after 200 OK so the page updates unreadCount=0 and myLastReadAt immediately. */
  onMarked: (result: ReadMarkerResponse) => void;
  /** Called if the backend answers 404 CONVERSATION_NOT_FOUND. */
  onNotFound: () => void;
}

/**
 * Automatically calls PUT /conversations/:id/read-marker when the viewer opens an unread conversation,
 * receives a new incoming message while viewing it, or returns to a visible tab.
 * Deduplicates by target key so re-renders never spam the endpoint.
 */
export function useReadMarker({
  conversation,
  latestMessage,
  onMarked,
  onNotFound,
}: UseReadMarkerOptions): void {
  const lastMarkedKeyRef = useRef<string | undefined>(undefined);
  const inFlightKeyRef = useRef<string | undefined>(undefined);
  const activeConvIdRef = useRef<string | undefined>(conversation?.id);
  const callbacksRef = useRef({ onMarked, onNotFound });

  useEffect(() => {
    callbacksRef.current = { onMarked, onNotFound };
  });

  useEffect(() => {
    activeConvIdRef.current = conversation?.id;
    lastMarkedKeyRef.current = undefined;
    inFlightKeyRef.current = undefined;
  }, [conversation?.id]);

  const tryMarkRead = useCallback(() => {
    if (!conversation) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    const meId = getCurrentUser()?.id;
    const key = shouldMarkConversationRead(conversation, latestMessage, meId, lastMarkedKeyRef.current);
    if (!key || inFlightKeyRef.current === key) return;

    const convId = conversation.id;
    inFlightKeyRef.current = key;

    chatApi.markRead(convId).then(
      (res) => {
        if (inFlightKeyRef.current === key) inFlightKeyRef.current = undefined;
        if (activeConvIdRef.current !== convId) return;
        lastMarkedKeyRef.current = key;
        callbacksRef.current.onMarked(res);
      },
      (error: unknown) => {
        if (inFlightKeyRef.current === key) inFlightKeyRef.current = undefined;
        if (activeConvIdRef.current !== convId) return;
        if (classifyChatError(error).code === 'CONVERSATION_NOT_FOUND') {
          callbacksRef.current.onNotFound();
        }
        // Transient network errors stay silent and will retry on next focus or incoming message.
      },
    );
  }, [conversation, latestMessage]);

  useEffect(() => {
    tryMarkRead();
  }, [tryMarkRead]);

  useEffect(() => {
    if (!conversation) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        tryMarkRead();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [conversation, tryMarkRead]);
}
