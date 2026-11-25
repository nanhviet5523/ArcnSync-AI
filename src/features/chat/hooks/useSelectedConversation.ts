import { useEffect, useRef, useState } from 'react';
import { t } from '@/i18n';
import type { ConversationItem } from '@/types/chat';
import { chatApi } from '../chatApi';
import { chatCache } from '../chatCache';
import { classifyChatError } from '../chatErrors';
import { isUuid } from '../chatIds';

export type SelectedConversation =
  | { status: 'none' }
  | { status: 'ready'; conversation: ConversationItem }
  | { status: 'loading' }
  /** `retry` only when asking again may help (network, 5xx). */
  | { status: 'error'; message: string; retry?: () => void };

/** Failed GET for one (id, attempt); anything older is ignored. */
type Failure = { key: string; message: string; retryable: boolean };

/**
 * The conversation open at /messages?c=<id>: from the loaded list, else the cache, else GET /conversations/:id
 * (once per id; a retry asks again). A `c` that is not a UUID is never sent: it is treated like a 404, which calls
 * `onNotFound` so the page can drop `c`. Other errors come back as status 'error'.
 */
export function useSelectedConversation(
  id: string | undefined,
  fromList: ConversationItem | undefined,
  onNotFound: () => void,
): SelectedConversation {
  const known = fromList ?? chatCache.getConversation(id);
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [, setLoaded] = useState(0);
  const notFoundRef = useRef(onNotFound);
  useEffect(() => { notFoundRef.current = onNotFound; });

  const key = `${id}#${attempt}`;
  const needsFetch = !!id && !known;

  useEffect(() => {
    if (!id || !needsFetch) return;
    if (!isUuid(id)) {
      // The backend would answer 400 BAD_REQUEST; to the user it is simply not found. No request.
      queueMicrotask(() => notFoundRef.current());
      return;
    }
    const controller = new AbortController();
    chatApi.getConversation(id, { signal: controller.signal }).then(
      (conversation) => {
        if (controller.signal.aborted) return;
        chatCache.setConversation(conversation);
        setLoaded((n) => n + 1); // re-render: `known` now comes from the cache
      },
      (e: unknown) => {
        if (controller.signal.aborted) return;
        const { code, messageKey, retryable } = classifyChatError(e);
        if (code === 'CONVERSATION_NOT_FOUND') {
          notFoundRef.current();
          return;
        }
        setFailure({ key, message: t(messageKey), retryable });
      },
    );
    // id changed (or unmount) while waiting: the answer is dropped.
    return () => controller.abort();
  }, [id, needsFetch, key]);

  if (!id) return { status: 'none' };
  if (known) return { status: 'ready', conversation: known };
  if (failure?.key === key) {
    return failure.retryable
      ? { status: 'error', message: failure.message, retry: () => setAttempt((n) => n + 1) }
      : { status: 'error', message: failure.message };
  }
  return { status: 'loading' };
}
