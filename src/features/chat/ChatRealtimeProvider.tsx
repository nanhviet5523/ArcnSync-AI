import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Z } from '@/components/ui/zIndex';
import { t } from '@/i18n';
import { getCurrentUser } from '@/services/authService';
import { onSignOut } from '@/services/signOut';
import type {
  CallSignalPayload,
  ChatContactUser,
  ConversationItem,
  IceServerItem,
  IncomingCallSignalEvent,
  VideoCallItem,
} from '@/types/chat';
import { chatApi } from './chatApi';
import { chatCache } from './chatCache';
import { videoCallFailure } from './chatErrors';
import { chatSocket } from './chatSocket';
import { IncomingCallModal } from './components/IncomingCallModal';
import { VideoCallOverlay } from './components/VideoCallOverlay';
import { VideoCallContext } from './videoCallContext';
import type { StartCallResult } from './videoCallContext';
import { callEndBanner, shouldIgnoreCallEvent } from './videoCallState';
import type { VideoCallPhase } from './videoCallState';
import { WebRtcCallSession } from './webrtcSession';
import type { MediaWarningCode, WebRtcConnectionStatus } from './webrtcSession';

const NOTICE_AUTO_HIDE_MS = 5_000;

/**
 * App-level provider mounted once in App.tsx:
 * - Keeps the `/chat` Socket.IO connection synchronized with the logged-in user (homeowner/staff/designer/supplier).
 * - Orchestrates all 4 video call endpoints + WebRTC P2P signaling globally so incoming calls work on any route.
 */
export function ChatRealtimeProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<VideoCallPhase>('idle');
  const [activeCall, setActiveCall] = useState<VideoCallItem | null>(null);
  const [peer, setPeer] = useState<ChatContactUser | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<WebRtcConnectionStatus>('idle');
  const [mediaWarning, setMediaWarning] = useState<MediaWarningCode>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [hasAudioTrack, setHasAudioTrack] = useState(false);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const [incomingBusy, setIncomingBusy] = useState<'accept' | 'decline' | null>(null);
  const [ending, setEnding] = useState(false);
  const [callError, setCallError] = useState('');
  const [notice, setNotice] = useState('');

  const phaseRef = useRef<VideoCallPhase>(phase);
  const activeCallRef = useRef<VideoCallItem | null>(activeCall);
  const peerRef = useRef<ChatContactUser | null>(peer);
  const sessionRef = useRef<WebRtcCallSession | null>(null);
  /** Buffer `call.signal` events that arrive before the WebRtcCallSession is constructed (e.g., fast offer). */
  const earlySignalsRef = useRef<IncomingCallSignalEvent[]>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const acceptedLocallyCallIdRef = useRef<string | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
    activeCallRef.current = activeCall;
    peerRef.current = peer;
  });

  const showNotice = useCallback((text: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setNotice(text);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('');
      noticeTimerRef.current = null;
    }, NOTICE_AUTO_HIDE_MS);
  }, []);

  const resetCallState = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    earlySignalsRef.current = [];
    acceptedLocallyCallIdRef.current = null;
    activeCallRef.current = null;
    phaseRef.current = 'idle';
    setPhase('idle');
    setActiveCall(null);
    setPeer(null);
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionStatus('idle');
    setMediaWarning(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsSharingScreen(false);
    setHasAudioTrack(false);
    setHasVideoTrack(false);
    setIncomingBusy(null);
    setEnding(false);
    setCallError('');
  }, []);

  /**
   * Relay one signal and act on a refused ack. VIDEO_CALL_NOT_ONGOING: the call ended on the server (its `call.ended`
   * may have been missed while the socket was down), so close it here. INVALID_SIGNAL: the payload is wrong, a
   * frontend bug. UNAUTHENTICATED / SIGNAL_TIMEOUT / SOCKET_DISCONNECTED: the socket reconnects by itself.
   */
  const sendCallSignal = useCallback(async (payload: CallSignalPayload) => {
    const ack = await chatSocket.emitCallSignal(payload);
    if (ack.ok) return ack;
    if (ack.code === 'INVALID_SIGNAL') {
      console.error('call.signal rejected the payload', payload.kind, payload.callId);
    } else if (ack.code === 'VIDEO_CALL_NOT_ONGOING' && activeCallRef.current?.id === payload.callId) {
      resetCallState();
      showNotice(t('chat.call.endedAlready'));
    }
    return ack;
  }, [resetCallState, showNotice]);

  const createWebRtcSession = useCallback((callId: string, iceServers: IceServerItem[]) => {
    sessionRef.current?.dispose();
    const session = new WebRtcCallSession(callId, iceServers, {
      sendSignal: sendCallSignal,
      onLocalStream: (stream) => {
        setLocalStream(stream);
        setHasAudioTrack(session.hasAudioTrack());
        setHasVideoTrack(session.hasVideoTrack());
        if (!session.hasVideoTrack()) setIsCameraOff(true);
      },
      onRemoteStream: (stream) => setRemoteStream(stream),
      onConnectionStatus: (status) => setConnectionStatus(status),
      onMediaWarning: (warning) => setMediaWarning(warning),
      onScreenShareChange: (sharing) => setIsSharingScreen(sharing),
    });
    sessionRef.current = session;

    // Replay any signals that arrived for this call before the session was constructed.
    const matching = earlySignalsRef.current.filter((sig) => sig.callId === callId);
    earlySignalsRef.current = earlySignalsRef.current.filter((sig) => sig.callId !== callId);
    for (const sig of matching) {
      session.handleSignal(sig);
    }
    return session;
  }, [sendCallSignal]);

  /** Resolve peer profile from chatCache or GET /conversations/:id when an incoming call arrives on any route. */
  const resolvePeerForConversation = useCallback((conversationId: string) => {
    const cached = chatCache.getConversation(conversationId);
    if (cached) {
      setPeer(cached.otherUser);
      return;
    }
    chatApi.getConversation(conversationId).then(
      (conversation) => {
        chatCache.setConversation(conversation);
        if (activeCallRef.current?.conversationId === conversationId) {
          setPeer(conversation.otherUser);
        }
      },
      () => {
        // Fallback label is used if conversation details cannot be fetched.
      },
    );
  }, []);

  /** Finalize any active call after a terminal socket event (DECLINED / ENDED / MISSED / CANCELLED). */
  const finishFromServerEvent = useCallback(
    (endedCall: VideoCallItem) => {
      if (shouldIgnoreCallEvent(activeCallRef.current, endedCall)) return;
      const meId = getCurrentUser()?.id;
      const isCaller = !!meId && endedCall.callerId === meId;
      const peerName = peerRef.current?.fullName ?? t('chat.call.startButton');
      const banner = callEndBanner(endedCall, isCaller, peerName);
      resetCallState();
      showNotice(t(banner.key, banner.vars));
    },
    [resetCallState, showNotice],
  );

  // 1. Keep Socket.IO `/chat` synced with auth session & clean up on sign-out/unmount.
  useEffect(() => {
    const sync = () => chatSocket.syncSession();
    sync();
    window.addEventListener('archsync-auth-change', sync);
    window.addEventListener('storage', sync);
    const offSignOut = onSignOut(() => {
      resetCallState();
      setNotice('');
    });
    return () => {
      window.removeEventListener('archsync-auth-change', sync);
      window.removeEventListener('storage', sync);
      offSignOut();
      sessionRef.current?.dispose();
      sessionRef.current = null;
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, [resetCallState]);

  // 2. Subscribe to global video-call socket events.
  useEffect(() => {
    const offIncoming = chatSocket.onCallIncoming(({ call }) => {
      const meId = getCurrentUser()?.id;
      if (!meId || call.status !== 'RINGING') return;

      // Callee receives incoming ring. Ignore if already in another call.
      if (call.calleeId === meId) {
        if (activeCallRef.current && activeCallRef.current.id !== call.id) return;
        activeCallRef.current = call;
        phaseRef.current = 'ringing-incoming';
        setActiveCall(call);
        setPhase('ringing-incoming');
        setCallError('');
        setIncomingBusy(null);
        resolvePeerForConversation(call.conversationId);
      }
    });

    const offAccepted = chatSocket.onCallAccepted(({ call }) => {
      const meId = getCurrentUser()?.id;
      if (!meId) return;
      if (shouldIgnoreCallEvent(activeCallRef.current, call)) return;

      // Caller receives `call.accepted` → transition RINGING → ONGOING and create WebRTC offer.
      if (call.callerId === meId && activeCallRef.current?.id === call.id) {
        activeCallRef.current = call;
        phaseRef.current = 'ongoing';
        setActiveCall(call);
        setPhase('ongoing');
        setCallError('');
        const session = sessionRef.current;
        if (session && session.getCallId() === call.id) {
          void session.connect(true).catch(() => {
            setCallError(t('chat.call.connectionFailed'));
          });
        }
        return;
      }

      // Callee on another tab accepted the same call → dismiss the stale incoming ring on this tab.
      if (
        call.calleeId === meId &&
        activeCallRef.current?.id === call.id &&
        acceptedLocallyCallIdRef.current !== call.id
      ) {
        resetCallState();
      }
    });

    const offDeclined = chatSocket.onCallDeclined(({ call }) => finishFromServerEvent(call));
    const offEnded = chatSocket.onCallEnded(({ call }) => finishFromServerEvent(call));

    const offSignal = chatSocket.onCallSignal((signal) => {
      const session = sessionRef.current;
      if (session && session.getCallId() === signal.callId) {
        session.handleSignal(signal);
        return;
      }
      // Buffer early signals (e.g. offer arriving right as callee finishes acceptCall).
      if (activeCallRef.current?.id === signal.callId) {
        earlySignalsRef.current.push(signal);
      }
    });

    return () => {
      offIncoming();
      offAccepted();
      offDeclined();
      offEnded();
      offSignal();
    };
  }, [finishFromServerEvent, resetCallState, resolvePeerForConversation]);

  // 3. Action: Caller initiates a video call — POST /conversations/:id/video-calls
  const startCall = useCallback(
    async (conversation: ConversationItem): Promise<StartCallResult> => {
      if (phaseRef.current !== 'idle') {
        return { ok: false, error: t('chat.call.busyDisabled') };
      }
      chatSocket.syncSession();
      chatCache.setConversation(conversation);
      phaseRef.current = 'starting';
      setPhase('starting');
      setPeer(conversation.otherUser);
      setCallError('');
      setNotice('');

      try {
        const { call, iceServers } = await chatApi.startVideoCall(conversation.id);
        // Guard in case user cancelled or logged out while awaiting 201
        if (phaseRef.current !== 'starting') {
          return { ok: false };
        }
        activeCallRef.current = call;
        phaseRef.current = 'ringing-outgoing';
        setActiveCall(call);
        setPhase('ringing-outgoing');

        const session = createWebRtcSession(call.id, iceServers);
        void session.prepareMedia();
        return { ok: true };
      } catch (error) {
        resetCallState();
        const failure = videoCallFailure(error);
        return {
          ok: false,
          error: t(failure.messageKey),
          blocked: failure.blocked,
          notFound: failure.notFound,
        };
      }
    },
    [createWebRtcSession, resetCallState],
  );

  // 4. Action: Callee accepts incoming call — POST /video-calls/:id/acceptance
  const acceptIncomingCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || incomingBusy) return;
    chatSocket.syncSession();
    setIncomingBusy('accept');
    setCallError('');
    acceptedLocallyCallIdRef.current = current.id;

    try {
      const { call, iceServers } = await chatApi.acceptVideoCall(current.id);
      if (activeCallRef.current?.id !== call.id) return;
      activeCallRef.current = call;
      phaseRef.current = 'ongoing';
      setActiveCall(call);
      setPhase('ongoing');
      setIncomingBusy(null);

      const session = createWebRtcSession(call.id, iceServers);
      await session.connect(false);
    } catch (error) {
      acceptedLocallyCallIdRef.current = null;
      setIncomingBusy(null);
      const failure = videoCallFailure(error);
      if (failure.alreadyEnded || failure.notFound) {
        resetCallState();
        showNotice(t(failure.messageKey));
        return;
      }
      setCallError(t(failure.messageKey));
    }
  }, [createWebRtcSession, incomingBusy, resetCallState, showNotice]);

  // 5. Action: Callee declines incoming call — POST /video-calls/:id/rejection
  const declineIncomingCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current || incomingBusy) return;
    setIncomingBusy('decline');
    setCallError('');

    try {
      const declined = await chatApi.rejectVideoCall(current.id);
      finishFromServerEvent(declined);
    } catch (error) {
      setIncomingBusy(null);
      const failure = videoCallFailure(error);
      if (failure.alreadyEnded || failure.notFound) {
        resetCallState();
        showNotice(t(failure.messageKey));
        return;
      }
      setCallError(t(failure.messageKey));
    }
  }, [finishFromServerEvent, incomingBusy, resetCallState, showNotice]);

  // 6. Action: Either participant ends/cancels call — POST /video-calls/:id/ending
  const endActiveCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) {
      resetCallState();
      return;
    }
    if (ending) return;
    setEnding(true);
    setCallError('');

    try {
      const ended = await chatApi.endVideoCall(current.id);
      finishFromServerEvent(ended);
    } catch (error) {
      const failure = videoCallFailure(error);
      // Peer may have ended/cancelled at the exact same moment → close cleanly without error.
      if (failure.alreadyEnded || failure.notFound) {
        resetCallState();
        return;
      }
      setEnding(false);
      setCallError(t(failure.messageKey));
    }
  }, [ending, finishFromServerEvent, resetCallState]);

  const handleToggleMute = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setIsMuted(session.toggleMute());
  }, []);

  const handleToggleCamera = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setIsCameraOff(session.toggleCamera());
  }, []);

  const handleToggleScreenShare = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    setCallError('');
    void session.toggleScreenShare().catch(() => {
      setCallError(t('chat.call.screenShareDenied'));
    });
  }, []);

  const handleOpenChat = useCallback(() => {
    const convId = activeCallRef.current?.conversationId;
    if (convId) {
      navigate(`/messages?c=${encodeURIComponent(convId)}`);
    } else {
      navigate('/messages');
    }
  }, [navigate]);

  const showOverlay =
    activeCall !== null &&
    (phase === 'starting' ||
      phase === 'ringing-outgoing' ||
      phase === 'connecting' ||
      phase === 'ongoing');

  return (
    <VideoCallContext.Provider value={{ phase, activeCall, startCall }}>
      {children}

      {phase === 'ringing-incoming' && activeCall && (
        <IncomingCallModal
          peer={peer}
          busyAction={incomingBusy}
          error={callError}
          onAccept={() => void acceptIncomingCall()}
          onDecline={() => void declineIncomingCall()}
        />
      )}

      {showOverlay && (
        <VideoCallOverlay
          call={activeCall}
          phase={phase}
          peer={peer}
          localStream={localStream}
          remoteStream={remoteStream}
          connectionStatus={connectionStatus}
          mediaWarning={mediaWarning}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSharingScreen={isSharingScreen}
          hasAudioTrack={hasAudioTrack}
          hasVideoTrack={hasVideoTrack}
          ending={ending}
          error={callError}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={() => void endActiveCall()}
          onOpenChat={handleOpenChat}
        />
      )}

      {notice && phase === 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 bottom-4 ${Z.modal} flex items-center gap-3 rounded-xl border border-slate-700/80 bg-slate-900 px-4 py-3 text-sm text-white shadow-xl sm:right-6 sm:bottom-6`}
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            aria-label={t('common.close')}
            className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      )}
    </VideoCallContext.Provider>
  );
}
