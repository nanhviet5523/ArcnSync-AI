import { Lock, Paperclip } from 'lucide-react';
import { Avatar, Button, EmptyState, ErrorState, Skeleton, roleLabel } from '@/components/ui';
import { t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import type { ConversationItem } from '@/types/chat';
import { stamp } from '../chatFormat';
import type { Conversations } from '../hooks/useConversations';

/** One line about the last message: its text, the file name, or the system note; "You:" for your own. */
function preview(c: ConversationItem, meId: string | undefined) {
  const m = c.lastMessage;
  if (!m) return t('chat.conversations.noMessages');
  const text = m.messageType === 'FILE' ? t('chat.conversations.file', { name: m.attachment?.name ?? m.content }) : m.content;
  return m.messageType !== 'SYSTEM' && m.senderId === meId ? t('chat.conversations.you', { text }) : text;
}

/**
 * The viewer's conversations, in the order the backend sends them (latest message first).
 * State comes from useConversations, so the page can share it. With `onSelect` each row is a button.
 */
export function ConversationList({ data, selectedId, onSelect, className = '' }: {
  data: Conversations;
  selectedId?: string;
  onSelect?: (conversation: ConversationItem) => void;
  className?: string;
}) {
  const { enabled, items, total, loading, loadingMore, error, hasMore, loadMore, retry } = data;
  if (!enabled) return null;
  const meId = getCurrentUser()?.id;

  return (
    <section aria-labelledby="conversations-title" className={`flex min-h-0 flex-col rounded-card border border-line bg-surface shadow-card ${className}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="conversations-title" className="text-[15px] font-semibold text-ink">{t('chat.conversations.title')}</h2>
        {!loading && !error && total > 0 && <span className="text-xs text-slate-500">{total}</span>}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={loading}>
        {loading ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : error && items.length === 0 ? (
          <div className="p-1"><ErrorState message={error} onRetry={retry} /></div>
        ) : items.length === 0 ? (
          <div className="p-1"><EmptyState compact title={t('chat.conversations.empty')} /></div>
        ) : (
          <ul className="space-y-1">
            {items.map((c) => (
              <li key={c.id}>
                <ConversationRow conversation={c} meId={meId} selected={c.id === selectedId} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}

        {/* a failed reload or "load more" keeps the rows already shown; retry repeats whichever failed */}
        {!loading && error && items.length > 0 && <div className="p-1 pt-2"><ErrorState message={error} onRetry={retry} /></div>}
      </div>

      {!loading && hasMore && !error && (
        <footer className="border-t border-line px-4 py-2.5">
          <Button size="sm" block loading={loadingMore} onClick={loadMore}>{t('chat.contacts.loadMore')}</Button>
        </footer>
      )}
    </section>
  );
}

function ConversationRow({ conversation: c, meId, selected, onSelect }: {
  conversation: ConversationItem;
  meId: string | undefined;
  selected: boolean;
  onSelect?: (conversation: ConversationItem) => void;
}) {
  const unread = c.unreadCount > 0;
  const when = c.lastMessageAt ?? c.lastMessage?.createdAt ?? c.createdAt;
  const system = c.lastMessage?.messageType === 'SYSTEM';

  const body = (
    <>
      <Avatar id={c.otherUser.id} name={c.otherUser.fullName} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm text-ink ${unread ? 'font-bold' : 'font-semibold'}`}>{c.otherUser.fullName}</span>
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{roleLabel(c.otherUser.role)}</span>
          <time dateTime={when} className={`ml-auto shrink-0 text-[11px] ${unread ? 'font-semibold text-brand' : 'text-slate-500'}`}>{stamp(when)}</time>
        </span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className={`flex min-w-0 flex-1 items-center gap-1 text-xs ${unread ? 'font-semibold text-ink' : 'text-slate-500'} ${system ? 'italic' : ''}`}>
            {c.lastMessage?.messageType === 'FILE' && <Paperclip aria-hidden className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{preview(c, meId)}</span>
          </span>
          {!c.canSend && (
            <span title={t('chat.conversations.readOnlyHint')} className="shrink-0 text-brand-on-dark">
              <Lock aria-hidden className="h-3.5 w-3.5" />
              <span className="sr-only">{t('chat.conversations.readOnly')}</span>
            </span>
          )}
          {unread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-[#FBF8EF] tabular-nums">
              <span aria-hidden>{c.unreadCount > 99 ? '99+' : c.unreadCount}</span>
              <span className="sr-only">{t('chat.conversations.unread', { n: c.unreadCount })}</span>
            </span>
          )}
        </span>
      </span>
    </>
  );

  const rowClass = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${selected ? 'bg-brand-soft ring-1 ring-inset ring-brand/30' : ''}`;
  if (!onSelect) return <div className={rowClass}>{body}</div>;
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      aria-current={selected ? 'true' : undefined}
      className={`${rowClass} cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${selected ? '' : 'hover:bg-slate-100'}`}
    >
      {body}
    </button>
  );
}
