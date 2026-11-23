import { apiRequest, apiUpload } from '@/services/authService';
import type {
  ChatMessagePage,
  ChatMessageSummary,
  SendMessageInput,
  ConversationItem,
  GetChatContactsQuery,
  GetConversationsQuery,
  GetMessagesQuery,
  OpenConversationBody,
  PaginatedChatContacts,
  PaginatedConversations,
} from '@/types/chat';
import type { UserRole } from '@/types/role';
import { chatContactsSearch, conversationsSearch, messagesSearch } from './chatQuery';
import { buildSendBody } from './sendMessage';

/** Roles allowed on the chat endpoints (@Roles CUSTOMER, STAFF, DESIGNER, SUPPLIER): everyone but admin. */
export const CHAT_ROLES: UserRole[] = ['homeowner', 'staff', 'designer', 'supplier'];
export const canChat = (role: UserRole | undefined): boolean => !!role && CHAT_ROLES.includes(role);

/** Chat endpoints. Private calls go through apiRequest (Bearer token, refresh on 401). */
export const chatApi = {
  /** People the viewer can chat with: shared projects first, then partners (Designer ↔ Supplier). */
  contacts: (query: GetChatContactsQuery = {}, init?: RequestInit) =>
    apiRequest<PaginatedChatContacts>(`/chat-contacts${chatContactsSearch(query)}`, init),
  /** The viewer's conversations, latest message first, with unreadCount and canSend. */
  getConversations: (query: GetConversationsQuery = {}, init?: RequestInit) =>
    apiRequest<PaginatedConversations>(`/conversations${conversationsSearch(query)}`, init),
  /** GET /conversations/:id. 404 CONVERSATION_NOT_FOUND also when the viewer is not one of the two people. */
  getConversation: (id: string, init?: RequestInit) =>
    apiRequest<ConversationItem>(`/conversations/${encodeURIComponent(id)}`, init),
  /**
   * GET /conversations/:id/messages, newest first. `before` = id of the oldest message held (older ones come back).
   * 400 INVALID_MESSAGE_CURSOR when `before` is not a message of this conversation.
   */
  getMessages: (conversationId: string, query: GetMessagesQuery = {}, init?: RequestInit) =>
    apiRequest<ChatMessagePage>(`/conversations/${encodeURIComponent(conversationId)}/messages${messagesSearch(query)}`, init),
  /**
   * POST /conversations/:id/messages → 201 ChatMessageSummary. With a file: multipart through apiUpload (progress,
   * browser-made boundary); without: JSON through apiRequest. Never retried here (no idempotency key on the backend).
   */
  sendMessage: (conversationId: string, input: SendMessageInput, onProgress?: (fraction: number) => void) => {
    const path = `/conversations/${encodeURIComponent(conversationId)}/messages`;
    const built = buildSendBody(input);
    return built.kind === 'form'
      ? apiUpload<ChatMessageSummary>(path, built.form, onProgress)
      : apiRequest<ChatMessageSummary>(path, { method: 'POST', body: JSON.stringify(built.body) });
  },
  /**
   * POST /conversations, find-or-create: 201 when created, 200 when it already existed, same body either way
   * (apiRequest resolves on any 2xx). Only call it on a user click: each call may create an empty conversation.
   */
  openConversation: (participantId: string) => {
    const body: OpenConversationBody = { participantId };
    return apiRequest<ConversationItem>('/conversations', { method: 'POST', body: JSON.stringify(body) });
  },
};
