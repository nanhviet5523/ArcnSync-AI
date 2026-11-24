import { apiFetch, apiRequest, apiUpload, buildApiError } from '@/services/authService';
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
  ReadMarkerResponse,
  VideoCallItem,
  VideoCallSession,
} from '@/types/chat';
import type { UserRole } from '@/types/role';
import { parseContentDispositionFileName, resolveAttachmentPath } from './attachmentUtils';
import { chatContactsSearch, conversationsSearch, messagesSearch } from './chatQuery';
import { buildSendBody } from './sendMessage';

/** Roles allowed on the chat endpoints (@Roles CUSTOMER, STAFF, DESIGNER, SUPPLIER): everyone but admin. */
export const CHAT_ROLES: UserRole[] = ['homeowner', 'staff', 'designer', 'supplier'];
export const canChat = (role: UserRole | undefined): boolean => !!role && CHAT_ROLES.includes(role);

export interface DownloadedAttachment {
  blob: Blob;
  contentType: string;
  fileName: string | null;
}

/** Chat endpoints. Private calls go through apiRequest/apiFetch (Bearer token, refresh on 401). */
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
  /**
   * GET /messages/:id/attachment → binary StreamableFile behind Bearer auth.
   * Preserves backend ApiError codes (MESSAGE_NOT_FOUND, CHAT_ATTACHMENT_NOT_FOUND, INSUFFICIENT_ROLE).
   */
  fetchAttachment: async (
    messageId: string,
    attachmentUrl?: string,
    init?: RequestInit,
  ): Promise<DownloadedAttachment> => {
    const path = resolveAttachmentPath(messageId, attachmentUrl);
    const res = await apiFetch(path, init);
    if (!res.ok) {
      throw buildApiError(
        res.status,
        await res.json().catch(() => null),
        'Could not download the file',
      );
    }
    const blob = await res.blob();
    return {
      blob,
      contentType: res.headers.get('Content-Type') ?? blob.type,
      fileName: parseContentDispositionFileName(res.headers.get('Content-Disposition')),
    };
  },
  /**
   * PUT /conversations/:id/read-marker → 200 { conversationId, lastReadAt }.
   * Server broadcasts `conversation.read` to both participants over `/chat` socket.
   */
  markRead: (conversationId: string, init?: RequestInit) =>
    apiRequest<ReadMarkerResponse>(`/conversations/${encodeURIComponent(conversationId)}/read-marker`, {
      ...init,
      method: 'PUT',
    }),
  /**
   * POST /conversations/:id/video-calls → 201 { call, iceServers } (status RINGING).
   * Server pushes `call.incoming` to both participants. 409 USER_BUSY if either user is in another active call.
   */
  startVideoCall: (conversationId: string, init?: RequestInit) =>
    apiRequest<VideoCallSession>(`/conversations/${encodeURIComponent(conversationId)}/video-calls`, {
      ...init,
      method: 'POST',
    }),
  /**
   * POST /video-calls/:id/acceptance → 200 { call, iceServers } (RINGING → ONGOING).
   * Callee only (403 NOT_VIDEO_CALL_CALLEE). Caller receives `call.accepted` and initiates WebRTC offer.
   */
  acceptVideoCall: (callId: string, init?: RequestInit) =>
    apiRequest<VideoCallSession>(`/video-calls/${encodeURIComponent(callId)}/acceptance`, {
      ...init,
      method: 'POST',
    }),
  /**
   * POST /video-calls/:id/rejection → 200 VideoCallItem (RINGING → DECLINED).
   * Callee only. Server emits `call.declined` and appends a SYSTEM message.
   */
  rejectVideoCall: (callId: string, init?: RequestInit) =>
    apiRequest<VideoCallItem>(`/video-calls/${encodeURIComponent(callId)}/rejection`, {
      ...init,
      method: 'POST',
    }),
  /**
   * POST /video-calls/:id/ending → 200 VideoCallItem (ONGOING → ENDED; caller RINGING → CANCELLED).
   * Server emits `call.ended` and appends a SYSTEM summary message.
   */
  endVideoCall: (callId: string, init?: RequestInit) =>
    apiRequest<VideoCallItem>(`/video-calls/${encodeURIComponent(callId)}/ending`, {
      ...init,
      method: 'POST',
    }),
};
