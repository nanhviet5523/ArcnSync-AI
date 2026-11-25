import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Avatar, Button, EmptyState, ErrorState, FilterBar, Skeleton, roleLabel } from '@/components/ui';
import { t } from '@/i18n';
import type { ChatContactItem } from '@/types/chat';
import { useChatContacts } from '../hooks/useChatContacts';
import { useOpenConversation } from '../hooks/useOpenConversation';

/**
 * People the viewer can chat with (GET /chat-contacts): search, shared projects, load more.
 * Renders nothing for admins (they cannot chat), so the request is never sent for them.
 * Clicking a row opens the conversation: straight there when the contact has one, else POST /conversations first.
 * `selectedUserId` marks the open one.
 */
export function ChatContactList({ selectedUserId, className = '' }: {
  selectedUserId?: string;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const { enabled, items, total, loading, loadingMore, error, hasMore, loadMore, retry } = useChatContacts(search);
  const opener = useOpenConversation();
  if (!enabled) return null;
  const onSelect = (c: ChatContactItem) => void opener.open(c.user.id, c.conversationId);

  const q = search.trim();
  return (
    <section aria-labelledby="chat-contacts-title" className={`flex min-h-0 flex-col rounded-card border border-line bg-surface shadow-card ${className}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-3">
        <h2 id="chat-contacts-title" className="text-[15px] font-semibold text-slate-900">{t('chat.contacts.title')}</h2>
        {!loading && !error && <span className="text-xs text-slate-500">{t('chat.contacts.count', { n: total })}</span>}
      </header>

      <div className="border-b border-line p-3">
        <FilterBar search={search} onSearch={setSearch} placeholder={t('chat.contacts.search')} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={loading || opener.isPending}>
        {opener.error && <div className="p-1 pb-2"><ErrorState message={opener.error} onRetry={opener.canRetry ? opener.retry : undefined} onDismiss={opener.reset} /></div>}
        {loading ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : error && items.length === 0 ? (
          <div className="p-1"><ErrorState message={error} onRetry={retry} /></div>
        ) : items.length === 0 ? (
          <div className="p-1"><EmptyState compact title={q ? t('chat.contacts.noMatch', { q }) : t('chat.contacts.empty')} /></div>
        ) : (
          <ul className="space-y-1">
            {items.map((c) => (
              <li key={c.user.id}>
                <ContactRow
                  contact={c}
                  selected={c.user.id === selectedUserId}
                  pending={opener.pendingId === c.user.id}
                  disabled={opener.isPending}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        )}

        {/* a failed reload or "load more" keeps the rows already shown; retry repeats whichever failed */}
        {!loading && error && items.length > 0 && <div className="p-1 pt-2"><ErrorState message={error} onRetry={retry} /></div>}
      </div>

      {!loading && items.length > 0 && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
          <span className="text-xs text-slate-500">{t('chat.contacts.showing', { shown: items.length, total })}</span>
          {hasMore && !error && <Button size="sm" loading={loadingMore} onClick={loadMore}>{t('chat.contacts.loadMore')}</Button>}
        </footer>
      )}
    </section>
  );
}

function ContactRow({ contact, selected, pending, disabled, onSelect }: {
  contact: ChatContactItem;
  selected: boolean;
  pending: boolean;
  disabled: boolean;
  onSelect: (contact: ChatContactItem) => void;
}) {
  const { user, sharedProjects, conversationId } = contact;
  const [first, ...rest] = sharedProjects;
  const role = user.companyName ? `${roleLabel(user.role)} · ${user.companyName}` : roleLabel(user.role);

  const body = (
    <>
      <Avatar id={user.id} name={user.fullName} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{user.fullName}</span>
          {conversationId && (
            <MessageCircle aria-label={t('chat.contacts.hasConversation')} className="h-3.5 w-3.5 shrink-0 text-brand" />
          )}
          {pending && <span aria-hidden className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand border-r-transparent" />}
        </span>
        <span className="block truncate text-xs text-slate-600">{role}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {first ? `${first.code} · ${first.title}` : t('chat.contacts.partner')}
          {rest.length > 0 && <span className="font-medium text-slate-600"> {t('chat.contacts.moreProjects', { n: rest.length })}</span>}
        </span>
      </span>
    </>
  );

  const rowClass = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${selected ? 'bg-brand-soft ring-1 ring-inset ring-brand/30' : ''}`;
  return (
    <button
      type="button"
      onClick={() => onSelect(contact)}
      disabled={disabled}
      aria-current={selected ? 'true' : undefined}
      aria-busy={pending || undefined}
      title={sharedProjects.map((p) => `${p.code} · ${p.title}`).join('\n') || undefined}
      className={`${rowClass} cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand disabled:cursor-wait ${selected ? '' : 'hover:bg-slate-100'}`}
    >
      {body}
    </button>
  );
}
