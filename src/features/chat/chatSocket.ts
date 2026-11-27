import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  API_BASE_URL,
  endSession,
  getAccessToken,
  getCurrentUser,
  refreshAccessToken,
  SESSION_ENDED_CODES,
} from '@/services/authService';
import { onSignOut } from '@/services/signOut';
import type {
  CallSignalAck,
  CallSignalPayload,
  ConversationReadSocketEvent,
  IncomingCallSignalEvent,
  MessageCreatedSocketEvent,
  VideoCallSocketEvent,
} from '@/types/chat';
import { canChat } from './chatApi';

export type ChatSocketStatus = 'disconnected' | 'connecting' | 'connected';

type Listener<T> = (payload: T) => void;

/** `connect_error` codes a fresh access token fixes. */
const AUTH_ERROR_CODES = new Set(['UNAUTHENTICATED', 'TOKEN_EXPIRED', 'INVALID_TOKEN']);
/** The gateway sends CHAT_NOT_ALLOWED for admins; INSUFFICIENT_ROLE is kept in case a role guard answers. */
const FORBIDDEN_ERROR_CODES = new Set(['CHAT_NOT_ALLOWED', 'INSUFFICIENT_ROLE']);
const SIGNAL_ACK_TIMEOUT_MS = 6_000;
/** Manual reconnect backoff (socket.io does not retry after the server's middleware refused the handshake). */
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;
/** Spread the resync after a reconnect so a backend restart is not hit by every client at once. */
const RESYNC_JITTER_MS = 3_000;

/**
 * Singleton Socket.IO client for backend namespace `/chat` (`ChatGateway`).
 * - Connects only for chat-enabled signed-in users (`CUSTOMER`, `STAFF`, `DESIGNER`, `SUPPLIER`).
 * - Refreshes the JWT and reconnects immediately on `io server disconnect` (token expiry grace = 10s)
 *   and auth-related `connect_error`, keeping ongoing video calls alive seamlessly.
 * - Session-ended codes (TOKEN_REVOKED, ACCOUNT_*...) sign out; other refusals retry with backoff.
 * - After a reconnect, tells `onResync` listeners (after a random delay) to reload what may have been missed.
 * - Disconnects automatically on sign-out.
 */
class ChatSocketManager {
  private socket: Socket | null = null;
  private connectedUserId: string | null = null;
  private status: ChatSocketStatus = 'disconnected';
  private refreshingReconnect = false;
  /** This socket has connected once: the next `connect` is a reconnect. */
  private hasConnected = false;
  private retryAttempt = 0;
  private retryTimer: number | null = null;
  private resyncTimer: number | null = null;

  private readonly resyncListeners = new Set<() => void>();
  private readonly statusListeners = new Set<Listener<ChatSocketStatus>>();
  private readonly messageCreatedListeners = new Set<Listener<MessageCreatedSocketEvent>>();
  private readonly conversationReadListeners = new Set<Listener<ConversationReadSocketEvent>>();
  private readonly callIncomingListeners = new Set<Listener<VideoCallSocketEvent>>();
  private readonly callAcceptedListeners = new Set<Listener<VideoCallSocketEvent>>();
  private readonly callDeclinedListeners = new Set<Listener<VideoCallSocketEvent>>();
  private readonly callEndedListeners = new Set<Listener<VideoCallSocketEvent>>();
  private readonly callSignalListeners = new Set<Listener<IncomingCallSignalEvent>>();

  private setStatus(next: ChatSocketStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const fn of [...this.statusListeners]) fn(next);
  }

  getStatus(): ChatSocketStatus {
    return this.status;
  }

  /** Sync socket connection with the current auth session (safe to call repeatedly). */
  syncSession(): void {
    const user = getCurrentUser();
    const token = getAccessToken();
    if (!user || !token || !canChat(user.role)) {
      this.disconnect();
      return;
    }

    // Account switched on the same tab: tear down the previous user's socket first.
    if (this.socket && this.connectedUserId && this.connectedUserId !== user.id) {
      this.disconnect();
    }

    if (this.socket) {
      if (!this.socket.connected && !this.socket.active) {
        this.setStatus('connecting');
        this.socket.connect();
      }
      return;
    }

    this.connectedUserId = user.id;
    this.setStatus('connecting');

    const socket = io(`${API_BASE_URL}/chat`, {
      // Dynamic auth callback: every reconnect reads the freshest access token.
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5_000,
    });

    socket.on('connect', () => {
      if (this.socket !== socket) return;
      this.retryAttempt = 0;
      this.clearRetry();
      this.setStatus('connected');
      if (this.hasConnected) this.scheduleResync();
      this.hasConnected = true;
    });

    socket.on('disconnect', (reason) => {
      if (this.socket !== socket) return;
      if (reason === 'io client disconnect') {
        this.setStatus('disconnected');
        return;
      }
      this.setStatus('connecting');
      // Backend disconnects sockets right at JWT expiry and grants a 10s offline grace window.
      // Refresh immediately and reconnect so ongoing video calls stay uninterrupted.
      if (reason === 'io server disconnect') {
        void this.refreshAndReconnect(socket);
      }
    });

    socket.on('connect_error', (err: Error & { data?: { code?: string } }) => {
      if (this.socket !== socket) return;
      const code = typeof err?.data?.code === 'string' ? err.data.code.toUpperCase() : '';
      if (SESSION_ENDED_CODES.has(code)) {
        // Signed in elsewhere, account locked...: no token will be accepted again. Sign-out disconnects this socket.
        endSession(code);
        return;
      }
      if (FORBIDDEN_ERROR_CODES.has(code)) {
        this.disconnect();
        return;
      }
      if (AUTH_ERROR_CODES.has(code)) {
        void this.refreshAndReconnect(socket);
        return;
      }
      this.setStatus('connecting');
      // A transport error keeps socket.active and socket.io retries by itself. A refusal by the server's middleware
      // (any other code) does not, so the socket would stay dead without a manual retry.
      if (!socket.active) this.scheduleRetry(socket);
    });

    socket.on('message.created', (payload: MessageCreatedSocketEvent) => {
      for (const fn of [...this.messageCreatedListeners]) fn(payload);
    });
    socket.on('conversation.read', (payload: ConversationReadSocketEvent) => {
      for (const fn of [...this.conversationReadListeners]) fn(payload);
    });
    socket.on('call.incoming', (payload: VideoCallSocketEvent) => {
      for (const fn of [...this.callIncomingListeners]) fn(payload);
    });
    socket.on('call.accepted', (payload: VideoCallSocketEvent) => {
      for (const fn of [...this.callAcceptedListeners]) fn(payload);
    });
    socket.on('call.declined', (payload: VideoCallSocketEvent) => {
      for (const fn of [...this.callDeclinedListeners]) fn(payload);
    });
    socket.on('call.ended', (payload: VideoCallSocketEvent) => {
      for (const fn of [...this.callEndedListeners]) fn(payload);
    });
    socket.on('call.signal', (payload: IncomingCallSignalEvent) => {
      for (const fn of [...this.callSignalListeners]) fn(payload);
    });

    this.socket = socket;
  }

  private async refreshAndReconnect(target: Socket): Promise<void> {
    if (this.refreshingReconnect || this.socket !== target) return;
    this.refreshingReconnect = true;
    try {
      await refreshAccessToken();
      if (this.socket === target && !target.connected) {
        this.setStatus('connecting');
        target.connect();
      }
    } catch {
      // A 401 already ended the session (sign-out disconnects this socket). 429, 5xx, network: keep the session and
      // try again later.
      if (this.socket === target && getCurrentUser()) this.scheduleRetry(target);
    } finally {
      this.refreshingReconnect = false;
    }
  }

  /** Reconnect `target` after an exponential, jittered delay (unless something else connects it first). */
  private scheduleRetry(target: Socket): void {
    if (this.retryTimer !== null) return;
    const delay = Math.min(RETRY_BASE_MS * 2 ** this.retryAttempt, RETRY_MAX_MS) * (0.5 + Math.random() / 2);
    this.retryAttempt += 1;
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      if (this.socket !== target || target.connected || target.active) return;
      this.setStatus('connecting');
      target.connect();
    }, delay);
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) window.clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private scheduleResync(): void {
    if (this.resyncTimer !== null) return;
    this.resyncTimer = window.setTimeout(() => {
      this.resyncTimer = null;
      if (!this.socket?.connected) return;
      for (const fn of [...this.resyncListeners]) fn();
    }, Math.random() * RESYNC_JITTER_MS);
  }

  disconnect(): void {
    const current = this.socket;
    this.socket = null;
    this.connectedUserId = null;
    this.refreshingReconnect = false;
    this.hasConnected = false;
    this.retryAttempt = 0;
    this.clearRetry();
    if (this.resyncTimer !== null) window.clearTimeout(this.resyncTimer);
    this.resyncTimer = null;
    if (current) {
      current.removeAllListeners();
      current.disconnect();
    }
    this.setStatus('disconnected');
  }

  /** Relay a WebRTC offer, answer or ICE candidate through `ChatGateway` (`call.signal`). */
  emitCallSignal(payload: CallSignalPayload): Promise<CallSignalAck> {
    const socket = this.socket;
    if (!socket || !socket.connected) {
      return Promise.resolve({ ok: false, code: 'SOCKET_DISCONNECTED' });
    }
    return new Promise<CallSignalAck>((resolve) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve({ ok: false, code: 'SIGNAL_TIMEOUT' });
        }
      }, SIGNAL_ACK_TIMEOUT_MS);

      socket.emit('call.signal', payload, (ack: CallSignalAck | undefined) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(ack ?? { ok: true });
      });
    });
  }

  /**
   * Called a random 0–3 s after the socket connects again (never on the first connect): events sent while it was down
   * are lost, so reload the latest data. Returns the unsubscribe function.
   */
  onResync(fn: () => void): () => void {
    this.resyncListeners.add(fn);
    return () => { this.resyncListeners.delete(fn); };
  }

  onStatusChange(fn: Listener<ChatSocketStatus>): () => void {
    this.statusListeners.add(fn);
    return () => { this.statusListeners.delete(fn); };
  }

  onMessageCreated(fn: Listener<MessageCreatedSocketEvent>): () => void {
    this.messageCreatedListeners.add(fn);
    return () => { this.messageCreatedListeners.delete(fn); };
  }

  onConversationRead(fn: Listener<ConversationReadSocketEvent>): () => void {
    this.conversationReadListeners.add(fn);
    return () => { this.conversationReadListeners.delete(fn); };
  }

  onCallIncoming(fn: Listener<VideoCallSocketEvent>): () => void {
    this.callIncomingListeners.add(fn);
    return () => { this.callIncomingListeners.delete(fn); };
  }

  onCallAccepted(fn: Listener<VideoCallSocketEvent>): () => void {
    this.callAcceptedListeners.add(fn);
    return () => { this.callAcceptedListeners.delete(fn); };
  }

  onCallDeclined(fn: Listener<VideoCallSocketEvent>): () => void {
    this.callDeclinedListeners.add(fn);
    return () => { this.callDeclinedListeners.delete(fn); };
  }

  onCallEnded(fn: Listener<VideoCallSocketEvent>): () => void {
    this.callEndedListeners.add(fn);
    return () => { this.callEndedListeners.delete(fn); };
  }

  onCallSignal(fn: Listener<IncomingCallSignalEvent>): () => void {
    this.callSignalListeners.add(fn);
    return () => { this.callSignalListeners.delete(fn); };
  }
}

export const chatSocket = new ChatSocketManager();

onSignOut(() => chatSocket.disconnect());
