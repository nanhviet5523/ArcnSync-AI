import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { Button, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { dayDivider, dayKey } from '../chatFormat';
import type { ConversationMessages } from '../hooks/useConversationMessages';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';

/**
 * The message thread of one conversation: oldest at the top, newest at the bottom. State comes from
 * useConversationMessages (held by the panel, so the composer can append to it).
 * Opens scrolled to the newest message; older pages load when the top comes into view (or with "Load earlier")
 * without moving what the reader is looking at. A new message of the viewer's own always scrolls to the bottom.
 */
export function MessageThread({ conversationId, thread }: { conversationId: string; thread: ConversationMessages }) {
  const { messages, loading, loadingOlder, hasMore, error, loadOlder, retry } = thread;
  const meId = getCurrentUser()?.id;
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  /** Scroll position saved right before an older page is requested. */
  const anchor = useRef<{ height: number; top: number; firstId: string | undefined } | null>(null);
  /** Conversation already scrolled to the bottom once. */
  const scrolledFor = useRef<string | null>(null);
  /** Newest message already laid out: a different one at the end means something was appended. */
  const lastSeen = useRef<string | undefined>(undefined);

  /** Remember where the reader is, so a prepended page can be compensated in the layout effect. */
  const saveAnchor = () => {
    const el = scroller.current;
    if (el) anchor.current = { height: el.scrollHeight, top: el.scrollTop, firstId: messages[0]?.id };
  };
  const requestOlder = () => {
    if (!scroller.current || loading || loadingOlder || !hasMore || error) return;
    saveAnchor();
    loadOlder();
  };
  // A retried older page must keep the position too. (After a retried first page the layout effect drops the anchor.)
  const retryKeepingPosition = retry ? () => { saveAnchor(); retry(); } : undefined;
  const requestOlderRef = useRef(requestOlder);
  useEffect(() => { requestOlderRef.current = requestOlder; });

  useLayoutEffect(() => {
    // A (re)load from the latest page (first open, cursor reset) ends scrolled to the bottom again.
    if (loading) { scrolledFor.current = null; return; }
    const el = scroller.current;
    if (!el) return;
    // First page shown: jump to the newest message.
    const last = messages[messages.length - 1];
    if (scrolledFor.current !== conversationId) {
      if (!last) return;
      scrolledFor.current = conversationId;
      lastSeen.current = last.id;
      anchor.current = null;
      el.scrollTop = el.scrollHeight;
      return;
    }
    // Appended at the end (just sent; realtime later): my own message always brings the view down.
    if (last && last.id !== lastSeen.current) {
      lastSeen.current = last.id;
      if (meId && last.senderId === meId) {
        anchor.current = null;
        el.scrollTop = el.scrollHeight;
        return;
      }
    }
    // Older page prepended: keep the same message under the reader's eyes.
    if (anchor.current && !loadingOlder && messages[0]?.id !== anchor.current.firstId) {
      el.scrollTop = anchor.current.top + (el.scrollHeight - anchor.current.height);
      anchor.current = null;
    }
  }, [conversationId, messages, loading, loadingOlder, meId]);

  // A new observer after each page: it reports at once if the top is still in view (short thread).
  useEffect(() => {
    const root = scroller.current;
    const target = sentinel.current;
    if (!root || !target || !hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) requestOlderRef.current(); },
      { root, rootMargin: '120px 0px 0px 0px' },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, messages.length]);

  if (loading) {
    return (
      <div className="flex-1 space-y-3 p-4" aria-busy>
        <Skeleton className="h-10 w-2/3 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
        <Skeleton className="h-16 w-3/5 rounded-2xl" />
        <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
      </div>
    );
  }
  if (error && messages.length === 0) {
    return <div className="p-4"><ErrorState message={error} onRetry={retryKeepingPosition} /></div>;
  }
  if (messages.length === 0) {
    return <div className="flex flex-1 items-center justify-center p-6"><EmptyState compact title={t('chat.thread.empty')} /></div>;
  }

  return (
    <div ref={scroller} role="log" aria-label={t('chat.thread.label')} aria-busy={loadingOlder} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
      <div ref={sentinel} aria-hidden className="h-px" />
      <div className="flex min-h-8 items-center justify-center pb-2">
        {loadingOlder ? (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand border-r-transparent" />
            {t('chat.thread.loadingEarlier')}
          </span>
        ) : error ? (
          <div className="w-full"><ErrorState message={error} onRetry={retryKeepingPosition} /></div>
        ) : hasMore ? (
          <Button size="sm" variant="ghost" onClick={requestOlder}>{t('chat.thread.loadEarlier')}</Button>
        ) : null}
      </div>

      <ol className="space-y-3">
        {messages.map((m, i) => {
          const newDay = i === 0 || dayKey(messages[i - 1].createdAt) !== dayKey(m.createdAt);
          const day = newDay ? dayDivider(m.createdAt) : '';
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li role="separator" className="flex items-center gap-3 py-1 text-[11px] font-medium text-slate-500">
                  <span className="h-px flex-1 bg-line" />
                  {day === 'today' ? t('chat.thread.today') : day === 'yesterday' ? t('chat.thread.yesterday') : day}
                  <span className="h-px flex-1 bg-line" />
                </li>
              )}
              <li>
                {m.messageType === 'SYSTEM'
                  ? <SystemMessage message={m} />
                  : <MessageBubble message={m} mine={!!meId && m.senderId === meId} />}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}
