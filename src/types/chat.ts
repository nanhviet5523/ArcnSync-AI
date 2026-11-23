/**
 * Chat contacts: GET /chat-contacts (backend ChatController, commit ecbe0fe).
 * Mirrors Paginated<ChatContactResponseDto>. Admins cannot chat: the endpoint answers 403 INSUFFICIENT_ROLE.
 */

/** A project the viewer and the contact both work on (ChatProjectResponseDto). */
export interface SharedProject {
  id: string;
  code: string;
  title: string;
}

/** The person to chat with (ChatUserResponseDto). No email or phone is returned. */
export interface ChatContactUser {
  id: string;
  fullName: string;
  /** Backend role code; ADMIN never appears because admins cannot chat. */
  role: 'CUSTOMER' | 'STAFF' | 'DESIGNER' | 'SUPPLIER';
  /** Company name, suppliers only. */
  companyName: string | null;
}

/** One contact (ChatContactResponseDto). */
export interface ChatContactItem {
  user: ChatContactUser;
  /** Projects in common; empty for a Designer – Supplier pair. */
  sharedProjects: SharedProject[];
  /** Existing 1-1 conversation with this person, if any. */
  conversationId: string | null;
}

/**
 * The only query params the endpoint accepts (forbidNonWhitelisted: anything else is a 400 VALIDATION_ERROR).
 * page ≥ 1, 1 ≤ limit ≤ 100 (default 20), q ≤ 100 chars: matches full name, email or supplier company name.
 */
export interface GetChatContactsQuery {
  page?: number;
  limit?: number;
  q?: string;
}

export interface PaginatedChatContacts {
  items: ChatContactItem[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// GET /conversations: Paginated<ConversationResponseDto>, newest message first (lastMessageAt DESC)
// ---------------------------------------------------------------------------

/** A file sent in chat (ChatAttachmentResponseDto). */
export interface ChatAttachment {
  name: string;
  mimeType: string;
  /** Bytes, BIGINT as a string. */
  sizeBytes: string;
  /** `/messages/{id}/attachment`: needs the Bearer token. */
  url: string;
}

/** TEXT and FILE are sent by people; SYSTEM is written by the server (e.g. a video call result). */
export type ChatMessageType = 'TEXT' | 'FILE' | 'SYSTEM';

/** A message (ChatMessageResponseDto); dates are ISO strings. */
export interface ChatMessageSummary {
  id: string;
  conversationId: string;
  senderId: string;
  /** null when the backend did not load the sender: use senderId. */
  sender: ChatContactUser | null;
  messageType: ChatMessageType;
  content: string;
  /** Project the message is about, if any. */
  project: SharedProject | null;
  designVersionId: string | null;
  /** Set exactly when messageType is FILE. */
  attachment: ChatAttachment | null;
  videoCallId: string | null;
  createdAt: string;
}

/** A 1-1 conversation of the viewer (ConversationResponseDto). */
export interface ConversationItem {
  id: string;
  otherUser: ChatContactUser;
  lastMessage: ChatMessageSummary | null;
  unreadCount: number;
  /** False once the two no longer share a project, or the other person is not ACTIVE. */
  canSend: boolean;
  sharedProjects: SharedProject[];
  myLastReadAt: string | null;
  /** When the other person last read the conversation ("Seen"). */
  otherLastReadAt: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// GET /conversations/:id/messages: cursor paging, newest first (createdAt DESC, then id DESC)
// ---------------------------------------------------------------------------

/** The only query params the endpoint accepts (forbidNonWhitelisted). */
export interface GetMessagesQuery {
  /** UUID of the OLDEST message the client has: only older ones come back. Leave out for the latest page. */
  before?: string;
  /** 1..100, default 30. */
  limit?: number;
}

/** No page or total: `hasMore` says whether older messages exist. */
export interface ChatMessagePage {
  /** Newest first. */
  items: ChatMessageSummary[];
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// POST /conversations/:id/messages → 201 ChatMessageSummary
// ---------------------------------------------------------------------------

/** What the composer sends. Empty optional fields are left out of the request (the backend checks IsUUID). */
export interface SendMessageInput {
  /** Trimmed by the backend, max 4000 characters. Required without a file; a caption with one. */
  content?: string;
  /** Exactly one file; sent as multipart field "file". */
  file?: File | null;
  /** One of conversation.sharedProjects. */
  projectId?: string | null;
  /** The backend infers projectId from the version. No UI yet. */
  designVersionId?: string | null;
}

/** JSON body when there is no file. */
export interface SendMessageJsonBody {
  content: string;
  projectId?: string;
  designVersionId?: string;
}

/**
 * POST /conversations body: open (find or create) the 1-1 conversation with this user. The answer is a
 * ConversationItem (lastMessage null for a new one).
 */
export interface OpenConversationBody {
  /** UUID of the person to message. */
  participantId: string;
}

/** The only query params GET /conversations accepts (PaginationQueryDto, forbidNonWhitelisted). */
export interface GetConversationsQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedConversations {
  items: ConversationItem[];
  page: number;
  limit: number;
  total: number;
}
