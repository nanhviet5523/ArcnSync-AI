import { apiFetch, apiRequest, buildApiError } from '@/services/authService';

export interface AiQuota { limit: number; used: number }
export interface AiConversation {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface AiConversationPage {
  items: AiConversation[];
  page: number;
  limit: number;
  total: number;
  quota: AiQuota;
}
export interface AiConversationDetail extends AiConversation { quota: AiQuota }
export interface AiSuggestedProduct {
  id: string;
  name: string;
  price: string;
  unit: string;
  categoryName: string | null;
  supplierName: string | null;
  styleNames: string[];
  thumbnailUrl: string | null;
}
export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  products: AiSuggestedProduct[];
  createdAt: string;
}
export interface AiMessagePage { items: AiMessage[]; hasMore: boolean }
export type AiStatusKind = 'SEARCHING_STYLES' | 'SEARCHING_PRODUCTS';
export interface AiStreamDone {
  message: AiMessage;
  generationId: string;
  usage: { inputTokens: number; outputTokens: number };
  quota: AiQuota;
}
export type AiStreamEvent =
  | { event: 'message'; data: AiMessage }
  | { event: 'status'; data: { kind: AiStatusKind } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'products'; data: { items: AiSuggestedProduct[] } }
  | { event: 'done'; data: AiStreamDone }
  | { event: 'error'; data: { code: string; message: string } };

export type KnowledgeSourceType = 'COMPLETED_PROJECT' | 'PRODUCT' | 'STYLE_GUIDE';
export interface KnowledgeIndexStatus {
  sourceType: KnowledgeSourceType;
  chunks: number;
  lastIndexedAt: string | null;
}

const enc = encodeURIComponent;

async function* readSse(response: Response): AsyncGenerator<AiStreamEvent> {
  if (!response.body) throw new Error('The AI response stream was empty.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = 'message';
  let dataLines: string[] = [];

  const parseFrame = (frame: string): AiStreamEvent | null => {
    eventName = 'message';
    dataLines = [];
    for (const line of frame.split(/\r?\n/)) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') eventName = value;
      if (field === 'data') dataLines.push(value);
    }
    if (!dataLines.length) return null;
    return { event: eventName, data: JSON.parse(dataLines.join('\n')) } as AiStreamEvent;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary = buffer.search(/\r?\n\r?\n/);
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)?.[0] ?? '\n\n';
        buffer = buffer.slice(boundary + separator.length);
        const parsed = parseFrame(frame);
        if (parsed) yield parsed;
        boundary = buffer.search(/\r?\n\r?\n/);
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const parsed = parseFrame(buffer);
      if (parsed) yield parsed;
    }
  } finally {
    reader.releaseLock();
  }
}

export const aiApi = {
  listConversations: (projectId: string, page = 1, limit = 100) =>
    apiRequest<AiConversationPage>(`/projects/${enc(projectId)}/ai-conversations?page=${page}&limit=${limit}`),
  createConversation: (projectId: string, title?: string) =>
    apiRequest<AiConversation>(`/projects/${enc(projectId)}/ai-conversations`, {
      method: 'POST', body: JSON.stringify(title?.trim() ? { title: title.trim() } : {}),
    }),
  getConversation: (id: string) => apiRequest<AiConversationDetail>(`/ai-conversations/${enc(id)}`),
  getMessages: (id: string, before?: string, limit = 30) => {
    const query = new URLSearchParams({ limit: String(limit) });
    if (before) query.set('before', before);
    return apiRequest<AiMessagePage>(`/ai-conversations/${enc(id)}/messages?${query}`);
  },
  async sendMessage(id: string, content: string, onEvent: (event: AiStreamEvent) => void, signal?: AbortSignal) {
    const response = await apiFetch(`/ai-conversations/${enc(id)}/messages`, {
      method: 'POST',
      headers: { Accept: 'text/event-stream' },
      body: JSON.stringify({ content }),
      signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw buildApiError(response.status, body, `AI request failed (${response.status}).`);
    }
    for await (const event of readSse(response)) {
      if (event.event === 'error') {
        const e = new Error(event.data.message) as Error & { code?: string };
        e.code = event.data.code;
        throw e;
      }
      onEvent(event);
    }
  },
  getKnowledgeIndex: (sourceType?: KnowledgeSourceType) => {
    const query = sourceType ? `?sourceType=${encodeURIComponent(sourceType)}` : '';
    return apiRequest<KnowledgeIndexStatus[]>(`/admin/knowledge-chunks${query}`);
  },
};
