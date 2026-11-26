import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bot, MessageSquarePlus, Package, Send, Sparkles, UserRound } from 'lucide-react';
import { AppShell, Button, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { ApiError, getCurrentUser } from '@/services/authService';
import type { UserRole } from '@/types/role';
import { aiApi } from './aiApi';
import type { AiConversation, AiConversationDetail, AiMessage, AiQuota, AiStatusKind } from './aiApi';

const PAGE_SIZE = 30;
const backPath = (role: UserRole, id: string) => role === 'homeowner'
  ? `/homeowner/projects/${encodeURIComponent(id)}`
  : role === 'designer' ? `/designer/projects/${encodeURIComponent(id)}` : `/staff/projects/${encodeURIComponent(id)}`;

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.code ? ` (${error.code})` : '';
    return `${error.message}${code} · HTTP ${error.status}`;
  }
  if (error instanceof Error) {
    const code = 'code' in error && typeof error.code === 'string' ? ` (${error.code})` : '';
    return `${error.message}${code}`;
  }
  return 'The AI request failed. Please try again.';
}

function quotaLabel(quota: AiQuota | null) {
  return quota ? `${Math.max(0, quota.limit - quota.used)} of ${quota.limit} AI requests remaining` : 'AI usage unavailable';
}

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
  const listRequest = useRef(0);
  const threadRequest = useRef(0);
  const sendLock = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

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
      if (request === listRequest.current) setError(errorMessage(e));
      return [];
    } finally {
      if (request === listRequest.current) setListLoading(false);
    }
  }, [projectId]);

  const loadThread = useCallback(async (id: string) => {
    const request = ++threadRequest.current;
    setSelectedId(id);
    setThreadLoading(true);
    setThreadError('');
    setMessages([]);
    setDetail(null);
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
      if (request === threadRequest.current) setThreadError(errorMessage(e));
    } finally {
      if (request === threadRequest.current) setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations().then((items) => {
      if (!selectedId && items.length) void loadThread(items[0].id);
    });
  // Only load when the project changes. Selection is intentionally kept stable during refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadConversations]);

  const createConversation = async () => {
    if (creating) return;
    setCreating(true);
    setError('');
    try {
      const created = await aiApi.createConversation(projectId);
      setConversations((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      await loadThread(created.id);
      setDraft('');
    } catch (e) {
      setError(errorMessage(e));
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
      setMessages((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...page.items].reverse().filter((item) => !known.has(item.id)).concat(current);
      });
      setHasMore(page.hasMore);
    } catch (e) {
      setThreadError(errorMessage(e));
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    const content = draft.trim();
    if (!selectedId || !content || sending || sendLock.current) return;
    if (content.length > 2000) { setThreadError('Messages can contain up to 2,000 characters.'); return; }
    if (quota && quota.used >= quota.limit) { setThreadError('This project has reached its AI usage limit.'); return; }
    sendLock.current = true;
    setSending(true);
    setStatus(null);
    setThreadError('');
    setDraft('');
    const tempUserId = `pending-user-${Date.now()}`;
    const tempAssistantId = `pending-assistant-${Date.now()}`;
    let userWasPersisted = false;
    setMessages((current) => [...current, {
      id: tempUserId, conversationId: selectedId, role: 'USER', content, products: [], createdAt: new Date().toISOString(),
    }]);
    try {
      await aiApi.sendMessage(selectedId, content, (event) => {
        if (event.event === 'message') {
          userWasPersisted = true;
          setMessages((current) => current.map((item) => item.id === tempUserId ? event.data : item));
        } else if (event.event === 'status') {
          setStatus(event.data.kind);
        } else if (event.event === 'delta') {
          setMessages((current) => {
            const exists = current.some((item) => item.id === tempAssistantId);
            if (!exists) return [...current, { id: tempAssistantId, conversationId: selectedId, role: 'ASSISTANT', content: event.data.text, products: [], createdAt: new Date().toISOString() }];
            return current.map((item) => item.id === tempAssistantId ? { ...item, content: item.content + event.data.text } : item);
          });
        } else if (event.event === 'products') {
          setMessages((current) => {
            const index = current.findIndex((item) => item.id === tempAssistantId);
            if (index < 0) return [...current, { id: tempAssistantId, conversationId: selectedId, role: 'ASSISTANT', content: '', products: event.data.items, createdAt: new Date().toISOString() }];
            return current.map((item) => item.id === tempAssistantId ? { ...item, products: event.data.items } : item);
          });
        } else if (event.event === 'done') {
          setMessages((current) => current.some((item) => item.id === tempAssistantId)
            ? current.map((item) => item.id === tempAssistantId ? event.data.message : item)
            : [...current, event.data.message]);
          setQuota(event.data.quota);
          setDetail((current) => current ? { ...current, quota: event.data.quota } : current);
          setStatus(null);
        }
      });
      await loadConversations();
    } catch (e) {
      setMessages((current) => current.filter((item) => item.id !== tempAssistantId && (userWasPersisted || item.id !== tempUserId)));
      setThreadError(errorMessage(e));
      setStatus(null);
      if (e instanceof ApiError && e.code === 'AI_QUOTA_EXCEEDED') {
        setQuota((current) => current ? { ...current, used: current.limit } : current);
      }
    } finally {
      sendLock.current = false;
      setSending(false);
      setStatus(null);
    }
  };

  const remaining = useMemo(() => quotaLabel(detail?.quota ?? quota), [detail?.quota, quota]);
  const back = backPath(role, projectId);

  return (
    <AppShell wide>
      <PageHeader
        back={{ to: back, label: 'Project' }}
        title="AI project assistant"
        description="Ask questions about this project, explore design styles, and get product suggestions from the catalog."
        secondary={<span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{remaining}</span>}
      />

      {error && <div className="mb-4"><ErrorState message={error} onRetry={() => void loadConversations()} /></div>}

      <div className="grid min-h-[min(72vh,760px)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
            <h2 className="text-sm font-semibold text-slate-900">Conversations</h2>
            <Button size="sm" variant="primary" loading={creating} onClick={() => void createConversation()}>
              <MessageSquarePlus className="mr-1.5 h-4 w-4" /> New chat
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {listLoading ? <div className="space-y-2 p-1">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
              : conversations.length === 0 ? <p className="p-3 text-sm text-slate-500">Start a conversation to ask the AI about this project.</p>
                : <ul className="space-y-1">{conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button type="button" onClick={() => void loadThread(conversation.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition ${selectedId === conversation.id ? 'bg-blue-50 text-dark' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className="block truncate text-sm font-medium">{conversation.title || 'New conversation'}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{new Date(conversation.updatedAt).toLocaleString()}</span>
                    </button>
                  </li>
                ))}</ul>}
          </div>
        </aside>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0" aria-label="AI conversation">
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-violet-700"><Sparkles className="h-6 w-6" /></span>
              <h2 className="text-lg font-semibold text-slate-900">Your project, with an AI guide</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">Ask about design direction or get product ideas that fit the project brief.</p>
              <Button variant="primary" className="mt-5" loading={creating} onClick={() => void createConversation()}>Start a conversation</Button>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Bot className="h-5 w-5" /></span>
                  <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">{detail?.title || conversations.find((c) => c.id === selectedId)?.title || 'Project assistant'}</h2>
                    <p className="text-xs text-slate-500">{status === 'SEARCHING_STYLES' ? 'Looking up design styles…' : status === 'SEARCHING_PRODUCTS' ? 'Finding matching products…' : sending ? 'Writing a response…' : 'AI assistant'}</p>
                  </div>
                </div>
                {hasMore && <Button size="sm" loading={loadingOlder} onClick={() => void loadOlder()}>Load earlier</Button>}
              </header>
              <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-busy={threadLoading || sending}>
                {threadLoading ? <div className="space-y-4"><Skeleton className="h-20 w-3/4 rounded-2xl" /><Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" /></div>
                  : threadError && messages.length === 0 ? <ErrorState message={threadError} onRetry={() => void loadThread(selectedId)} />
                    : messages.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">Ask your first question about the project.</p>
                      : messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                {threadError && messages.length > 0 && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{threadError}</p>}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="border-t border-slate-100 p-3 sm:p-4">
                <label htmlFor="ai-question" className="sr-only">Ask the project AI</label>
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                  <textarea id="ai-question" value={draft} maxLength={2000} rows={2} disabled={sending || threadLoading}
                    onChange={(event) => setDraft(event.target.value)} placeholder="Ask about the project, a design style, or suitable products…"
                    className="max-h-36 min-h-12 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60" />
                  <Button type="submit" variant="primary" disabled={!draft.trim() || sending || threadLoading || Boolean(quota && quota.used >= quota.limit)} aria-label="Send question">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1.5 flex justify-between gap-3 px-1 text-[11px] text-slate-500"><span>AI answers use this project’s context. Verify important decisions with your design team.</span><span className="shrink-0">{draft.length}/2000</span></p>
              </form>
            </>
          )}
        </section>
      </div>
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
      <div className={`max-w-[min(88%,720px)] rounded-2xl px-4 py-3 ${user ? 'bg-info text-white' : 'bg-slate-50 text-slate-800'}`}>
        {message.content && <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
        {message.products.length > 0 && <div className="mt-3 grid gap-2 sm:grid-cols-2">{message.products.map((product) => (
          <div key={product.id} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-800">
            <div className="flex gap-2"><Package className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{product.name}</p>
              <p className="mt-1 text-xs text-slate-600">{product.categoryName || 'Product'}{product.supplierName ? ` · ${product.supplierName}` : ''}</p>
              <p className="mt-1 text-xs font-semibold">{Number(product.price).toLocaleString('en-US')} VND / {product.unit}</p>
            </div></div>
          </div>
        ))}</div>}
        <time className={`mt-2 block text-[10px] ${user ? 'text-blue-100' : 'text-slate-400'}`} dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
      </div>
    </article>
  );
}

export default ProjectAiAssistant;
