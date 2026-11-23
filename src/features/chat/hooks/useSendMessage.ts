import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import type { ChatMessageSummary, SendMessageInput } from '@/types/chat';
import { chatApi } from '../chatApi';
import { sendMessageFailure } from '../chatErrors';
import type { SendEffect } from '../chatErrors';

export interface SendCallbacks {
  /** 201: the saved message (append it to the thread, move the conversation up). */
  onSent: (message: ChatMessageSummary) => void;
  /** 403 CHAT_NOT_ALLOWED / 422 CHAT_RECIPIENT_INACTIVE: make the conversation read only. */
  onBlocked: (conversationId: string) => void;
  /** 404 CONVERSATION_NOT_FOUND. */
  onNotFound: () => void;
}

export type SendResult = { ok: true; message: ChatMessageSummary } | { ok: false; effect: SendEffect };

export interface SendMessage {
  /** One request at a time: a call while sending resolves to { ok: false } without a request. */
  send: (input: SendMessageInput) => Promise<SendResult>;
  sending: boolean;
  /** Upload progress 0–1 while a file goes up; null for a text-only message or when idle. */
  progress: number | null;
  error: string;
  reset: () => void;
}

/**
 * POST /conversations/:id/messages for the composer. No optimistic UI and no automatic retry: the caller clears the
 * draft only after `{ ok: true }`. Nothing is set after unmount, but onSent still runs so list and cache stay right.
 */
export function useSendMessage(conversationId: string, callbacks: SendCallbacks): SendMessage {
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const latest = useRef(callbacks);
  useEffect(() => { latest.current = callbacks; });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const send = async (input: SendMessageInput): Promise<SendResult> => {
    if (inFlight.current) return { ok: false, effect: null };
    inFlight.current = true;
    setSending(true);
    setError('');
    setProgress(input.file ? 0 : null);
    try {
      const message = await chatApi.sendMessage(conversationId, input, (fraction) => {
        if (mounted.current) setProgress(fraction);
      });
      latest.current.onSent(message);
      return { ok: true, message };
    } catch (e) {
      const failure = sendMessageFailure(e);
      if (failure.clientBug) console.error('POST /conversations/:id/messages rejected the body', conversationId, e);
      if (failure.effect === 'blocked') latest.current.onBlocked(conversationId);
      if (failure.effect === 'notFound') latest.current.onNotFound();
      if (mounted.current) setError(t(failure.messageKey));
      return { ok: false, effect: failure.effect };
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setSending(false);
        setProgress(null);
      }
    }
  };

  return { send, sending, progress, error, reset: () => setError('') };
}
