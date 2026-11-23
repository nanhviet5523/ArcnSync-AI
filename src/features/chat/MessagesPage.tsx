import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, MessagesSquare } from 'lucide-react';
import { AppShell, Avatar, ErrorState, PageHeader, Skeleton, roleLabel } from '@/components/ui';
import { t } from '@/i18n';
import type { ConversationItem } from '@/types/chat';
import { chatCache } from './chatCache';
import { ConversationList } from './components/ConversationList';
import { MessageComposer } from './components/MessageComposer';
import { MessageThread } from './components/MessageThread';
import { useConversationMessages } from './hooks/useConversationMessages';
import { useConversations } from './hooks/useConversations';
import { useSelectedConversation } from './hooks/useSelectedConversation';
import type { SendCallbacks } from './hooks/useSendMessage';
import { moveToTop, replaceItem } from './pagedList';

/**
 * /messages: conversations on the left (~340px), the open conversation on the right (`?c=<conversationId>`).
 * The route is closed to admins (ProtectedRoute), who cannot chat. Phones show one column at a time.
 */
export function MessagesPage() {
  const data = useConversations();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('c') ?? undefined;
  const [notFound, setNotFound] = useState(false);
  // 404 (or a `c` that is not a UUID) from the conversation or its messages: drop `c` and say so.
  const onNotFound = () => {
    setNotFound(true);
    setParams({}, { replace: true });
  };
  // Not on the loaded page (just opened, or F5 on ?c=): cache, else GET /conversations/:id.
  const current = useSelectedConversation(selectedId, data.items.find((c) => c.id === selectedId), onNotFound);
  const selected = current.status === 'ready' ? current.conversation : undefined;
  const select = (c: ConversationItem | null) => {
    setNotFound(false);
    setParams(c ? { c: c.id } : {});
  };

  // Changes after a send are applied in place (list + cache): no GET /conversations, no skeleton flash.
  const [, setCacheVersion] = useState(0);
  const loadedItems = useRef(data.items);
  useEffect(() => { loadedItems.current = data.items; });
  const updateConversation = (id: string, change: (c: ConversationItem) => ConversationItem, moveUp: boolean) => {
    const base = loadedItems.current.find((c) => c.id === id) ?? chatCache.getConversation(id);
    if (!base) return;
    const next = change(base);
    chatCache.setConversation(next);
    data.updateItems((items) => (moveUp ? moveToTop(items, next) : replaceItem(items, next)));
    setCacheVersion((n) => n + 1); // the open conversation may live only in the cache
  };
  const sendCallbacks: SendCallbacks = {
    // unreadCount stays as it is: the read marker is a later task.
    onSent: (m) => updateConversation(m.conversationId, (c) => ({ ...c, lastMessage: m, lastMessageAt: m.createdAt }), true),
    onBlocked: (id) => updateConversation(id, (c) => ({ ...c, canSend: false }), false),
    onNotFound,
  };

  return (
    <AppShell wide>
      <PageHeader title={t('chat.page.title')} description={t('chat.page.description')} />
      {notFound && (
        <div className="mb-4"><ErrorState message={t('chat.errors.CONVERSATION_NOT_FOUND')} onDismiss={() => setNotFound(false)} /></div>
      )}
      <div className="grid h-[calc(100dvh-14rem)] min-h-112 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={`min-h-0 ${selectedId ? 'hidden lg:block' : ''}`}>
          <ConversationList data={data} selectedId={selectedId} onSelect={select} className="h-full" />
        </div>
        <section
          aria-label={selected ? selected.otherUser.fullName : t('chat.page.selectTitle')}
          aria-busy={current.status === 'loading'}
          className={`min-h-0 flex-col rounded-card border border-line bg-surface shadow-card ${selectedId ? 'flex' : 'hidden lg:flex'}`}
        >
          {current.status === 'loading' ? <ConversationPanelSkeleton /> : current.status === 'error' ? (
            <div className="p-4"><ErrorState message={current.message} onRetry={current.retry} onDismiss={() => select(null)} /></div>
          ) : selected ? <ConversationPanel conversation={selected} onBack={() => select(null)} callbacks={sendCallbacks} /> : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand"><MessagesSquare aria-hidden className="h-6 w-6" /></span>
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

/** Who the conversation is with, the projects you share, the message thread and the composer. */
function ConversationPanel({ conversation: c, onBack, callbacks }: { conversation: ConversationItem; onBack: () => void; callbacks: SendCallbacks }) {
  const thread = useConversationMessages(c.id, callbacks.onNotFound);
  // A sent message lands in the thread (deduped by id) before the page moves the conversation up.
  const composerCallbacks: SendCallbacks = {
    ...callbacks,
    onSent: (message) => {
      thread.appendMessage(message);
      callbacks.onSent(message);
    },
  };
  const who =c.otherUser.companyName ? `${roleLabel(c.otherUser.role)} · ${c.otherUser.companyName}` : roleLabel(c.otherUser.role);
  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={onBack} aria-label={t('chat.page.back')} className="-ml-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand lg:hidden">
          <ChevronLeft aria-hidden className="h-5 w-5" />
        </button>
        <Avatar id={c.otherUser.id} name={c.otherUser.fullName} size="md" />
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-slate-900">{c.otherUser.fullName}</h2>
          <p className="truncate text-xs text-slate-500">{who}</p>
        </div>
      </header>
      {c.sharedProjects.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
          {c.sharedProjects.map((p) => (
            <li key={p.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{p.code} · {p.title}</li>
          ))}
        </ul>
      )}
      <MessageThread conversationId={c.id} thread={thread} />
      {/* canSend from the backend decides whether the composer is open. key: a draft never follows you elsewhere. */}
      <MessageComposer key={c.id} conversation={c} callbacks={composerCallbacks} />
    </>
  );
}

export default MessagesPage;
