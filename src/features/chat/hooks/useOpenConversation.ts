import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { canChat, chatApi } from '../chatApi';
import { chatCache } from '../chatCache';
import { conversationPath } from '../chatIds';
import { openConversationFailure } from '../chatErrors';

export interface OpenConversation {
  /**
   * Open the 1-1 conversation with `participantId` and go to it. With `existingConversationId` (a contact that already
   * has one) it navigates straight there without calling the API. Ignored while a request is in flight.
   */
  open: (participantId: string, existingConversationId?: string | null) => Promise<void>;
  /** False for admins, signed-out visitors and the viewer's own id: don't render a "Message" button then. */
  canOpen: (participantId: string) => boolean;
  isPending: boolean;
  /** The user being opened while isPending, to show the spinner on the right row. */
  pendingId: string | null;
  /** Message of the last failure ('' when none). */
  error: string;
  /** True only when repeating the last failed open may succeed (network, 5xx). Otherwise offer a dismiss. */
  canRetry: boolean;
  /** Repeat the last failed open. */
  retry: () => void;
  /** Dismiss the error. */
  reset: () => void;
}

/**
 * POST /conversations behind a click. On success: caches the conversation, refetches chat-contacts and conversations,
 * then navigates to /messages?c=<id>. One request at a time per hook; nothing is set or navigated after unmount.
 */
export function useOpenConversation(): OpenConversation {
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [canRetry, setCanRetry] = useState(false);
  const inFlight = useRef(false);
  const lastTarget = useRef<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const canOpen = (participantId: string) => {
    const me = getCurrentUser();
    return !!me && canChat(me.role) && !!participantId && participantId !== me.id;
  };

  const open = async (participantId: string, existingConversationId?: string | null) => {
    if (existingConversationId) {
      setError('');
      navigate(conversationPath(existingConversationId));
      return;
    }
    if (inFlight.current || !canOpen(participantId)) return;

    inFlight.current = true;
    lastTarget.current = participantId;
    setPendingId(participantId);
    setError('');
    try {
      // 200 (already existed) and 201 (created) both land here with the same body.
      const conversation = await chatApi.openConversation(participantId);
      chatCache.setConversation(conversation);
      chatCache.invalidate('chat-contacts', 'conversations');
      if (mounted.current) navigate(conversationPath(conversation.id));
    } catch (e) {
      const failure = openConversationFailure(e);
      if (failure.clientBug) console.error('POST /conversations rejected participantId', participantId, e);
      if (failure.staleContact) chatCache.invalidate('chat-contacts');
      if (mounted.current) {
        setError(t(failure.messageKey));
        setCanRetry(failure.retryable);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPendingId(null);
    }
  };

  return {
    open,
    canOpen,
    isPending: pendingId !== null,
    pendingId,
    error,
    canRetry: !!error && canRetry,
    retry: () => { if (lastTarget.current) void open(lastTarget.current); },
    reset: () => setError(''),
  };
}
