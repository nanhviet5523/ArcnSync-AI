import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, MessagesSquare, Video, X } from 'lucide-react';
import { AppShell, Avatar, ErrorState, PageHeader, Skeleton, roleLabel } from '@/components/ui';
import { t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import type { ConversationItem } from '@/types/chat';
import { chatApi } from './chatApi';
import { chatCache } from './chatCache';
import { chatSocket } from './chatSocket';
import { ChatContactList } from './components/ChatContactList';
import { ConversationList } from './components/ConversationList';
import { MessageComposer } from './components/MessageComposer';
import { MessageThread } from './components/MessageThread';
import { useConversationMessages } from './hooks/useConversationMessages';
import { useConversations } from './hooks/useConversations';
import { useReadMarker } from './hooks/useReadMarker';
import { useSelectedConversation } from './hooks/useSelectedConversation';
import type { SendCallbacks } from './hooks/useSendMessage';
import { moveToTop, replaceItem } from './pagedList';
import { applyIncomingMessageToConversation, applyReadMarker } from './readMarker';
import { useVideoCall } from './videoCallContext';
import { canStartCallInConversation } from './videoCallState';

/**
 * /messages: conversations on the left (~340px), the open conversation on the right (`?c=<conversationId>`).
 * The route is closed to admins (ProtectedRoute), who cannot chat. Phones show one column at a time.
 */
export function MessagesPage() {
  const data = useConversations();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c') ?? undefined;
  const [notFound, setNotFound] = useState(false);
  // Left column: the conversation list, or the contact list to start a new chat ("New message").
  const [showContacts, setShowContacts] = useState(false);
  // Opening a contact navigates to ?c=<id>: go back to the list, where that conversation is now highlighted.
  useEffect(() => { setShowContacts(false); }, [selectedId]);

  // 404 (or a `c` that is not a UUID) from the conversation or its messages: drop `c` and say so.
  const onNotFound = useCallback(() => {
    setNotFound(true);
    setParams({}, { replace: true });
  }, [setParams]);

  // Not on the loaded page (just opened, or F5 on ?c=): cache, else GET /conversations/:id.
  const current = useSelectedConversation(selectedId, data.items.find((c) => c.id === selectedId), onNotFound);
  const selected = current.status === 'ready' ? current.conversation : undefined;
  const select = (c: ConversationItem | null) => {
    setNotFound(false);
    setParams(c ? { c: c.id } : {});
  };

  // Changes after a send, read marker or socket event are applied in place (list + cache): no skeleton flash.
  const [, setCacheVersion] = useState(0);
  const loadedItems = useRef(data.items);
  const selectedIdRef = useRef(selectedId);
  const fetchingMissingRef = useRef(new Set<string>());
  useEffect(() => {
    loadedItems.current = data.items;
    selectedIdRef.current = selectedId;
  });

  const { updateItems } = data;

  const updateConversation = useCallback(
    (id: string, change: (c: ConversationItem) => ConversationItem, moveUp: boolean) => {
      const base = loadedItems.current.find((c) => c.id === id) ?? chatCache.getConversation(id);
      if (!base) return false;
      const next = change(base);
      if (next === base && !moveUp) return true;
      chatCache.setConversation(next);
      updateItems((items) => (moveUp ? moveToTop(items, next) : replaceItem(items, next)));
      setCacheVersion((n) => n + 1); // the open conversation may live only in the cache
      return true;
    },
    [updateItems],
  );

  // Subscribe to realtime `message.created` and `conversation.read` from Socket.IO `/chat`.
  useEffect(() => {
    chatSocket.syncSession();

    const offMessage = chatSocket.onMessageCreated(({ conversationId, message }) => {
      const meId = getCurrentUser()?.id;
      const isOpenAndVisible =
        selectedIdRef.current === conversationId &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';

      const updated = updateConversation(
        conversationId,
        (c) => applyIncomingMessageToConversation(c, message, meId, isOpenAndVisible),
        true,
      );

      // Brand-new conversation started by the other person: fetch it once and prepend to the list.
      if (!updated && !fetchingMissingRef.current.has(conversationId)) {
        fetchingMissingRef.current.add(conversationId);
        chatApi.getConversation(conversationId).then(
          (conv) => {
            fetchingMissingRef.current.delete(conversationId);
            chatCache.setConversation(conv);
            updateItems((items) => moveToTop(items, conv));
            setCacheVersion((n) => n + 1);
          },
          () => {
            fetchingMissingRef.current.delete(conversationId);
          },
        );
      }
    });

    const offRead = chatSocket.onConversationRead(({ conversationId, userId, lastReadAt }) => {
      const meId = getCurrentUser()?.id;
      updateConversation(
        conversationId,
        (c) => applyReadMarker(c, userId, lastReadAt, meId),
        false,
      );
    });

    // After a reconnect, unread counts and last messages may be stale: reload the conversation list.
    const offResync = chatSocket.onResync(() => chatCache.invalidate('conversations'));

    return () => {
      offMessage();
      offRead();
      offResync();
    };
  }, [updateItems, updateConversation]);

  const onReadMarked = useCallback(
    (conversationId: string, lastReadAt: string) => {
      const meId = getCurrentUser()?.id;
      if (!meId) return;
      updateConversation(
        conversationId,
        (c) => applyReadMarker(c, meId, lastReadAt, meId),
        false,
      );
    },
    [updateConversation],
  );

  const sendCallbacks: SendCallbacks = {
    onSent: (m) => {
      const meId = getCurrentUser()?.id;
      updateConversation(
        m.conversationId,
        (c) => applyIncomingMessageToConversation(c, m, meId, true),
        true,
      );
    },
    onBlocked: (id) => { updateConversation(id, (c) => ({ ...c, canSend: false }), false); },
    onNotFound,
  };

  return (
    <AppShell wide footer={false}>
      <PageHeader title={t('chat.page.title')} description={t('chat.page.description')} />
      {notFound && (
        <div className="mb-4">
          <ErrorState message={t('chat.errors.CONVERSATION_NOT_FOUND')} onDismiss={() => setNotFound(false)} />
        </div>
      )}
      <div className="grid h-[calc(100dvh-14rem)] min-h-112 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={`min-h-0 ${selectedId ? 'hidden lg:block' : ''}`}>
          {showContacts ? (
            <ChatContactList
              selectedUserId={selected?.otherUser.id}
              onBack={() => setShowContacts(false)}
              className="h-full"
            />
          ) : (
            <ConversationList
              data={data}
              selectedId={selectedId}
              onSelect={select}
              onNewChat={() => setShowContacts(true)}
              className="h-full"
            />
          )}
        </div>
        <section
          aria-label={selected ? selected.otherUser.fullName : t('chat.page.selectTitle')}
          aria-busy={current.status === 'loading'}
          className={`min-h-0 flex-col rounded-card border border-line bg-surface shadow-card ${selectedId ? 'flex' : 'hidden lg:flex'}`}
        >
          {current.status === 'loading' ? (
            <ConversationPanelSkeleton />
          ) : current.status === 'error' ? (
            <div className="p-4">
              <ErrorState message={current.message} onRetry={current.retry} onDismiss={() => select(null)} />
            </div>
          ) : selected ? (
            <ConversationPanel
              key={selected.id}
              conversation={selected}
              onBack={() => select(null)}
              callbacks={sendCallbacks}
              onReadMarked={onReadMarked}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                <MessagesSquare aria-hidden className="h-6 w-6" />
              </span>
              <h2 className="text-base font-semibold text-slate-900">{t('chat.page.selectTitle')}</h2>
              <p className="max-w-sm text-sm text-slate-600">{t('chat.page.selectBody')}</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

/** Same shape as ConversationPanel while GET /conversations/:id is on its way. */
function ConversationPanelSkeleton() {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
      </div>
    </>
  );
}

/** Who the conversation is with, video call trigger, shared projects, message thread, read marker and composer. */
function ConversationPanel({
  conversation: c,
  onBack,
  callbacks,
  onReadMarked,
}: {
  conversation: ConversationItem;
  onBack: () => void;
  callbacks: SendCallbacks;
  onReadMarked: (conversationId: string, lastReadAt: string) => void;
}) {
  const thread = useConversationMessages(c.id, callbacks.onNotFound);
  const { phase, startCall } = useVideoCall();
  const [startingCall, setStartingCall] = useState(false);
  const [callStartError, setCallStartError] = useState('');

  // Append incoming realtime messages (including SYSTEM video-call logs) into this open thread.
  const appendRef = useRef(thread.appendMessage);
  useEffect(() => {
    appendRef.current = thread.appendMessage;
  });
  useEffect(() => {
    return chatSocket.onMessageCreated(({ conversationId, message }) => {
      if (conversationId === c.id) {
        appendRef.current(message);
      }
    });
  }, [c.id]);
  // After a socket reconnect, messages sent while it was down never arrived: reload the latest page of this thread.
  const resyncRef = useRef(thread.resync);
  useEffect(() => {
    resyncRef.current = thread.resync;
  });
  useEffect(() => chatSocket.onResync(() => resyncRef.current()), []);

  // Mark conversation as read (PUT /conversations/:id/read-marker) when opened or receiving messages while visible.
  const latestMessage = thread.messages[thread.messages.length - 1];
  useReadMarker({
    conversation: c,
    latestMessage,
    onMarked: (res) => onReadMarked(res.conversationId, res.lastReadAt),
    onNotFound: callbacks.onNotFound,
  });

  // A sent message lands in the thread (deduped by id) before the page moves the conversation up.
  const composerCallbacks: SendCallbacks = {
    ...callbacks,
    onSent: (message) => {
      thread.appendMessage(message);
      callbacks.onSent(message);
    },
  };

  const canCall = canStartCallInConversation(c, phase) && !startingCall;
  const callDisabledReason = !c.canSend
    ? t('chat.call.readOnlyDisabled')
    : phase !== 'idle'
      ? t('chat.call.busyDisabled')
      : undefined;

  const handleStartCall = async () => {
    if (!canCall) return;
    setStartingCall(true);
    setCallStartError('');
    const result = await startCall(c);
    setStartingCall(false);
    if (!result.ok) {
      if (result.blocked) callbacks.onBlocked(c.id);
      if (result.notFound) callbacks.onNotFound();
      if (result.error) setCallStartError(result.error);
    }
  };

  const who = c.otherUser.companyName
    ? `${roleLabel(c.otherUser.role)} · ${c.otherUser.companyName}`
    : roleLabel(c.otherUser.role);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('chat.page.back')}
          className="-ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand lg:hidden"
        >
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <Avatar id={c.otherUser.id} name={c.otherUser.fullName} size="md" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold text-slate-900">{c.otherUser.fullName}</h2>
          <p className="truncate text-xs text-slate-500">{who}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleStartCall()}
          disabled={!canCall}
          aria-label={t('chat.call.startAria', { name: c.otherUser.fullName })}
          title={callDisabledReason ?? t('chat.call.startButton')}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-slate-700 transition hover:border-brand/40 hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {startingCall ? (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <Video aria-hidden className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t('chat.call.startButton')}</span>
        </button>
      </header>
      {callStartError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800"
        >
          <span>{callStartError}</span>
          <button
            type="button"
            onClick={() => setCallStartError('')}
            aria-label={t('common.close')}
            className="cursor-pointer rounded p-0.5 hover:bg-rose-100"
          >
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {c.sharedProjects.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          {c.sharedProjects.map((p) => (
            <li key={p.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {p.code} · {p.title}
            </li>
          ))}
        </ul>
      )}
      <MessageThread conversationId={c.id} thread={thread} otherLastReadAt={c.otherLastReadAt} />
      {/* canSend from the backend decides whether the composer is open. key: a draft never follows you elsewhere. */}
      <MessageComposer key={c.id} conversation={c} callbacks={composerCallbacks} />
    </>
  );
}

export default MessagesPage;
