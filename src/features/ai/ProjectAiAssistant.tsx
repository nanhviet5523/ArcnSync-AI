import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBlocker, useParams } from 'react-router-dom';
import { Bot, MessageSquarePlus, Package, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react';
import { AppShell, Banner, Button, ErrorState, Modal, PageHeader, Skeleton, toast } from '@/components/ui';
import { formatDateTime, formatMoney, t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { projectApi } from '@/features/projects/projectApi';
import type { ProjectStatus } from '@/features/projects/projectApi';
import { aiApi } from './aiApi';
import type { AiConversation, AiConversationDetail, AiMessage, AiQuota, AiStatusKind } from './aiApi';
import { advanceTurn, applyStreamEvent, classifyAiError, failTurn, startTurn } from './aiLogic';
import type { AiError } from './aiLogic';

const PAGE_SIZE = 30;
const MAX_LENGTH = 2000;
/** Within this many px of the bottom, a new message or streamed text keeps the thread scrolled down. */
const STICK_PX = 80;

const backPath = (role: UserRole, id: string) => role === 'homeowner'
  ? `/homeowner/projects/${encodeURIComponent(id)}`
  : role === 'designer' ? `/designer/projects/${encodeURIComponent(id)}` : `/staff/projects/${encodeURIComponent(id)}`;

/** Classifies by backend `code`; an unmapped code is logged, the user gets the generic sentence. */
function classify(e: unknown): AiError {
  const c = classifyAiError(e);
  if (!c.known) console.warn('[ai] unmapped error', c.code || e);
  return c;
}

/** The answer to this question failed after the server saved the question: the error and "Try again" sit under it. */
interface FailedTurn { messageId: string; content: string; text: string; retryable: boolean }

export function ProjectAiAssistant() {
  const { projectId = '' } = useParams();
  const role = getCurrentUser()?.role ?? 'homeowner';
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<AiConversationDetail | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [quota, setQuota] = useState<AiQuota | null>(null);
  const [draft, setDraft] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<AiStatusKind | null>(null);
  const [error, setError] = useState('');
  const [threadError, setThreadError] = useState('');
  const [failed, setFailed] = useState<FailedTurn | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  /** The server answered PROJECT_CLOSED (the project may have been cancelled after this page loaded). */
  const [closedByServer, setClosedByServer] = useState(false);
  /** Switching or starting a conversation while an answer streams waits for the user to confirm. */
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const listRequest = useRef(0);
  const threadRequest = useRef(0);
  const sendLock = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  /** Distance from the bottom to restore after older messages are prepended. */
  const keepFromBottom = useRef<number | null>(null);
  /** The answer being streamed. */
  const streamCtl = useRef<AbortController | null>(null);
  // Unmount (closing the tab, a hard navigation): stop the model without asking.
  useEffect(() => () => { streamCtl.current?.abort(); }, []);

  const closed = projectStatus === 'CANCELLED' || closedByServer;
  const quotaFull = !!quota && quota.used >= quota.limit;

  useEffect(() => {
    let live = true;
    // only to lock a cancelled project; if this fails the server still answers PROJECT_CLOSED
    projectApi.get(projectId).then((p) => { if (live) setProjectStatus(p.status); }).catch(() => {});
    return () => { live = false; };
  }, [projectId]);

  const loadConversations = useCallback(async () => {
    const request = ++listRequest.current;
    setListLoading(true);
    setError('');
    try {
      const result = await aiApi.listConversations(projectId);
      if (request !== listRequest.current) return result.items;
      setConversations(result.items);
      setQuota(result.quota);
      return result.items;
    } catch (e) {
      if (request === listRequest.current) setError(t(classify(e).messageKey));
      return [];
    } finally {
      if (request === listRequest.current) setListLoading(false);
    }
  }, [projectId]);

  /** Quota only, without the list skeleton. */
  const refreshQuota = useCallback(() => {
    aiApi.listConversations(projectId, 1, 1).then((r) => setQuota(r.quota)).catch(() => {});
  }, [projectId]);

  const clearThread = useCallback(() => {
    threadRequest.current++;
    setSelectedId('');
    setDetail(null);
    setMessages([]);
    setHasMore(false);
    setFailed(null);
    setThreadError('');
  }, []);

  /** Side effects of an error code. Returns true when the conversation was dropped (nothing more to show in it). */
  const applyAction = useCallback((c: AiError) => {
    if (c.action === 'deselect') {
      clearThread();
      void loadConversations();
      toast.error(t(c.messageKey));
      return true;
    }
    if (c.action === 'closed') setClosedByServer(true);
    if (c.action === 'quota') setQuota((q) => (q ? { ...q, used: q.limit } : q));
    return false;
  }, [clearThread, loadConversations]);

  const loadThread = useCallback(async (id: string) => {
    const request = ++threadRequest.current;
    setSelectedId(id);
    setThreadLoading(true);
    setThreadError('');
    setFailed(null);
    setMessages([]);
    setDetail(null);
    nearBottom.current = true;
    try {
      const [conversation, page] = await Promise.all([
        aiApi.getConversation(id), aiApi.getMessages(id, undefined, PAGE_SIZE),
      ]);
      if (request !== threadRequest.current) return;
      setDetail(conversation);
      setQuota(conversation.quota);
      setMessages([...page.items].reverse());
      setHasMore(page.hasMore);
    } catch (e) {
      if (request !== threadRequest.current) return;
      const c = classify(e);
      if (!applyAction(c)) setThreadError(t(c.messageKey));
    } finally {
      if (request === threadRequest.current) setThreadLoading(false);
    }
  }, [applyAction]);

  useEffect(() => {
    void loadConversations().then((items) => {
      if (!selectedId && items.length) void loadThread(items[0].id);
    });
  // Only load when the project changes. Selection is intentionally kept stable during refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  // Follow the thread down while the reader is at the bottom; never pull them down from older messages.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (keepFromBottom.current !== null) {
      el.scrollTop = el.scrollHeight - keepFromBottom.current;
      keepFromBottom.current = null;
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, failed, threadError, threadLoading]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
  };

  /** Runs `action` now, or after the user confirms leaving an answer that is still streaming. */
  const guard = (action: () => void) => {
    if (sendLock.current) setPendingLeave(() => action);
    else action();
  };

  /** Stops the stream. The server still counts the request (CLIENT_ABORTED): fetch the quota again. */
  const abortStream = () => {
    streamCtl.current?.abort();
    streamCtl.current = null;
    refreshQuota();
    // the server records the abort once it notices the closed connection
    window.setTimeout(refreshQuota, 2000);
  };

  // in-app navigation away from this page while an answer streams
  const blocker = useBlocker(useCallback(
    ({ currentLocation, nextLocation }) => sendLock.current && currentLocation.pathname !== nextLocation.pathname,
    [],
  ));

  const createConversation = async () => {
    if (creating || closed) return;
    setCreating(true);
    setError('');
    try {
      const created = await aiApi.createConversation(projectId);
      setConversations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await loadThread(created.id);
      setDraft('');
    } catch (e) {
      const c = classify(e);
      applyAction(c);
      if (c.action !== 'deselect') toast.error(t(c.messageKey));
    } finally {
      setCreating(false);
    }
  };

  const loadOlder = async () => {
    if (!selectedId || !messages.length || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    setThreadError('');
    try {
      const page = await aiApi.getMessages(selectedId, messages[0].id, PAGE_SIZE);
      const el = listRef.current;
      if (el) keepFromBottom.current = el.scrollHeight - el.scrollTop;
      setMessages((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...page.items].reverse().filter((item) => !known.has(item.id)).concat(current);
      });
      setHasMore(page.hasMore);
    } catch (e) {
      const c = classify(e);
      if (!applyAction(c)) setThreadError(t(c.messageKey));
    } finally {
      setLoadingOlder(false);
    }
  };

  /** Sends the draft, or `retryContent` again after a failed answer. */
  const send = async (retryContent?: string) => {
    const content = (retryContent ?? draft).trim();
    if (!selectedId || !content || sending || sendLock.current || closed) return;
    if (content.length > MAX_LENGTH) { setThreadError(t('ai.tooLong', { max: MAX_LENGTH.toLocaleString('en-US') })); return; }
    if (quotaFull) { setThreadError(t('ai.errors.AI_QUOTA_EXCEEDED')); return; }
    sendLock.current = true;
    setSending(true);
    setStatus(null);
    setThreadError('');
    setFailed(null);
    if (retryContent === undefined) setDraft('');
    const conversationId = selectedId;
    const started = startTurn(conversationId, content);
    let turn = started.turn;
    const controller = new AbortController();
    streamCtl.current = controller;
    nearBottom.current = true;
    setMessages((current) => [...current, started.message]);
    try {
      await aiApi.sendMessage(conversationId, content, (event) => {
        if (controller.signal.aborted) return;
        if (event.event === 'status') { setStatus(event.data.kind); return; }
        const before = turn;
        turn = advanceTurn(before, event);
        setMessages((current) => applyStreamEvent(current, before, event));
        if (event.event === 'done') {
          setQuota(event.data.quota);
          setDetail((current) => (current ? { ...current, quota: event.data.quota } : current));
          setStatus(null);
        }
      }, controller.signal);
      // the stream closed without `done`: treat it as a failed answer
      if (!turn.done && !controller.signal.aborted) throw new Error('The AI stream ended before the answer was complete.');
      await loadConversations();
    } catch (e) {
      // Left the page or switched conversation: the thread on screen is another one, leave it alone.
      if (controller.signal.aborted) return;
      const c = classify(e);
      const failedTurn = turn;
      setMessages((current) => failTurn(current, failedTurn));
      if (applyAction(c)) return;
      if (failedTurn.userSaved) {
        // the question is saved: keep it, put the error and "Try again" under it
        setFailed({ messageId: failedTurn.userId, content, text: t(c.messageKey), retryable: c.action === 'none' });
        // the server's count, not ours (AI_PROVIDER_ERROR is not counted)
        refreshQuota();
      } else {
        // nothing reached the conversation: give the text back
        setThreadError(t(c.messageKey));
        if (retryContent === undefined) setDraft((d) => d || content);
      }
    } finally {
      if (streamCtl.current === controller) streamCtl.current = null;
      sendLock.current = false;
      setSending(false);
      setStatus(null);
    }
  };

  const remaining = quota
    ? t('ai.quota', { left: Math.max(0, quota.limit - quota.used), limit: quota.limit })
    : t('ai.quotaUnavailable');
  const back = backPath(role, projectId);
  const leaveOpen = blocker.state === 'blocked' || pendingLeave !== null;
  const stay = () => {
    if (blocker.state === 'blocked') blocker.reset();
    setPendingLeave(null);
  };
  const leave = () => {
    abortStream();
    if (blocker.state === 'blocked') blocker.proceed();
    const action = pendingLeave;
    setPendingLeave(null);
    action?.();
  };
  const statusLine = status === 'SEARCHING_STYLES' ? t('ai.statusStyles')
    : status === 'SEARCHING_PRODUCTS' ? t('ai.statusProducts')
      : sending ? t('ai.statusWriting') : t('ai.statusIdle');

  return (
    <AppShell wide>
      <PageHeader
        back={{ to: back, label: t('ai.back') }}
        title={t('ai.title')}
        description={t('ai.description')}
        secondary={<span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{remaining}</span>}
      />

      {closed && <div className="mb-4"><Banner tone="amber">{t('ai.closedNote')}</Banner></div>}
      {error && <div className="mb-4"><ErrorState message={error} onRetry={() => void loadConversations()} /></div>}

      <div className="grid min-h-[min(72vh,760px)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:min-h-0">
          <div className="flex items-center justify-between gap-2 border-b border-line p-3">
            <h2 className="text-sm font-semibold text-ink">{t('ai.conversations')}</h2>
            {!closed && (
              <Button size="sm" variant="primary" loading={creating} onClick={() => guard(() => void createConversation())}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" /> {t('ai.newChat')}
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listLoading ? <div className="space-y-2 p-1">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              : conversations.length === 0 ? <p className="p-3 text-sm text-slate-500">{t(closed ? 'ai.noConversationsClosed' : 'ai.noConversations')}</p>
                : <ul className="space-y-1">{conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button type="button" onClick={() => { if (conversation.id !== selectedId) guard(() => void loadThread(conversation.id)); }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${selectedId === conversation.id ? 'bg-sand-100 text-dark' : 'text-slate-700 hover:bg-sand-50'}`}>
                      <span className="block truncate text-sm font-medium">{conversation.title || t('ai.untitled')}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{formatDateTime(conversation.updatedAt)}</span>
                    </button>
                  </li>
                ))}</ul>}
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:min-h-0" aria-label={t('ai.threadLabel')}>
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Sparkles className="h-6 w-6" /></span>
              <h2 className="text-lg font-semibold text-ink">{t('ai.emptyTitle')}</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{t('ai.emptyBody')}</p>
              {!closed && <Button variant="primary" className="mt-5" loading={creating} onClick={() => void createConversation()}>{t('ai.start')}</Button>}
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Bot className="h-5 w-5" /></span>
                  <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-ink">{detail?.title || conversations.find((c) => c.id === selectedId)?.title || t('ai.assistantName')}</h2>
                    <p className="text-xs text-slate-500" aria-live="polite">{statusLine}</p>
                  </div>
                </div>
                {hasMore && <Button size="sm" loading={loadingOlder} onClick={() => void loadOlder()}>{t('ai.loadEarlier')}</Button>}
              </header>
              <div ref={listRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-busy={threadLoading || sending}>
                {threadLoading ? <div className="space-y-4"><Skeleton className="h-20 w-3/4 rounded-2xl" /><Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" /></div>
                  : threadError && messages.length === 0 ? <ErrorState message={threadError} onRetry={() => void loadThread(selectedId)} />
                    : messages.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">{t('ai.firstQuestion')}</p>
                      : messages.map((message) => (
                        <div key={message.id}>
                          <MessageBubble message={message} />
                          {failed?.messageId === message.id && (
                            <div role="alert" className="mt-2 flex flex-wrap items-center justify-end gap-2 text-sm text-rose-800">
                              <span>{failed.text}</span>
                              {failed.retryable && !closed && !quotaFull && (
                                <Button size="sm" disabled={sending} onClick={() => void send(failed.content)}>
                                  <RotateCcw aria-hidden className="mr-1.5 h-3.5 w-3.5" />{t('ai.retry')}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                {threadError && messages.length > 0 && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{threadError}</p>}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t border-line p-3 sm:p-4">
                <label htmlFor="ai-question" className="sr-only">{t('ai.inputLabel')}</label>
                <div className="flex items-end gap-2 rounded-2xl border border-line bg-sand-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <textarea id="ai-question" value={draft} maxLength={MAX_LENGTH} rows={2} disabled={sending || threadLoading || closed}
                    onChange={(event) => setDraft(event.target.value)} placeholder={closed ? t('ai.closedNote') : t('ai.placeholder')}
                    className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-subtext disabled:opacity-60" />
                  <Button type="submit" variant="primary" disabled={!draft.trim() || sending || threadLoading || closed || quotaFull} aria-label={t('ai.send')}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 flex justify-between gap-3 px-1 text-[11px] text-slate-500"><span>{t('ai.disclaimer')}</span><span className="shrink-0">{t('ai.counter', { n: draft.length, max: MAX_LENGTH })}</span></p>
              </form>
            </>
          )}
        </section>
      </div>

      {leaveOpen && (
        <Modal title={t('ai.leaveTitle')} onClose={stay} footer={<>
          <Button onClick={stay}>{t('ai.leaveStay')}</Button>
          <Button variant="danger" onClick={leave}>{t('ai.leaveConfirm')}</Button>
        </>}>
          <p className="text-sm leading-6 text-slate-600">{t('ai.leaveBody')}</p>
        </Modal>
      )}
    </AppShell>
  );
}

function MessageBubble({ message }: { message: AiMessage }) {
  const user = message.role === 'USER';
  return (
    <article className={`flex gap-2.5 ${user ? 'flex-row-reverse' : ''}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${user ? 'bg-info text-white' : 'bg-violet-100 text-violet-700'}`}>
        {user ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={`max-w-[min(88%,720px)] rounded-2xl px-4 py-3 ${user ? 'bg-info text-white' : 'bg-sand-50 text-ink'}`}>
        {message.content && <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
        {message.products.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{message.products.map((product) => (
          <div key={product.id} className="rounded-xl border border-line bg-surface p-3 text-ink">
            <div className="flex gap-2"><Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="mt-1 text-xs text-slate-600">{product.categoryName || t('ai.product')}{product.supplierName ? ` · ${product.supplierName}` : ''}</p>
              <p className="mt-1 text-xs font-semibold">{t('ai.price', { price: formatMoney(product.price), unit: product.unit })}</p>
            </div></div>
          </div>
        ))}</div>}
        <time className={`mt-2 block text-[10px] ${user ? 'text-blue-100' : 'text-subtext'}`} dateTime={message.createdAt}>{formatDateTime(message.createdAt)}</time>
      </div>
    </article>
  );
}

export default ProjectAiAssistant;
