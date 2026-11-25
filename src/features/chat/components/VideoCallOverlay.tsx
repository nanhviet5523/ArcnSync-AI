import { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  PhoneOff,
  Video,
  VideoOff,
  AlertTriangle,
} from 'lucide-react';
import { Avatar, roleLabel } from '@/components/ui';
import { Z } from '@/components/ui/zIndex';
import { t } from '@/i18n';
import type { ChatContactUser, VideoCallItem } from '@/types/chat';
import { elapsedSecondsSince, formatCallDuration } from '../videoCallState';
import type { VideoCallPhase } from '../videoCallState';
import type { MediaWarningCode, WebRtcConnectionStatus } from '../webrtcSession';

interface VideoCallOverlayProps {
  call: VideoCallItem;
  phase: VideoCallPhase;
  peer: ChatContactUser | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionStatus: WebRtcConnectionStatus;
  mediaWarning: MediaWarningCode;
  isMuted: boolean;
  isCameraOff: boolean;
  isSharingScreen: boolean;
  hasAudioTrack: boolean;
  hasVideoTrack: boolean;
  ending: boolean;
  error: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onOpenChat: () => void;
}

/**
 * Bind a MediaStream to a `<video>` element cleanly and re-sync whenever tracks change.
 * Always muted for local preview (prevents acoustic echo).
 */
function StreamVideo({
  stream,
  muted,
  mirrored,
  className,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (stream) {
      void el.play().catch(() => {
        // Browser autoplay policy may wait for user interaction on unmuted audio.
      });
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={`${className ?? ''} ${mirrored ? '-scale-x-100' : ''}`}
    />
  );
}

/**
 * Production 1-1 WebRTC video call overlay.
 * - Full-screen responsive stage with remote video, local PiP preview, live timer, status pills, and controls.
 * - Supports minimizing to a compact floating bar so users can continue viewing chat/drawings during a call.
 */
export function VideoCallOverlay({
  call,
  phase,
  peer,
  localStream,
  remoteStream,
  connectionStatus,
  mediaWarning,
  isMuted,
  isCameraOff,
  isSharingScreen,
  hasAudioTrack,
  hasVideoTrack,
  ending,
  error,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  onOpenChat,
}: VideoCallOverlayProps) {
  const [minimized, setMinimized] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== 'ongoing' || !call.answeredAt) return;
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [phase, call.answeredAt]);

  const elapsed = phase === 'ongoing' ? elapsedSecondsSince(call.answeredAt, nowMs) : 0;
  const peerName = peer?.fullName ?? t('chat.call.startButton');
  const peerMeta = peer
    ? peer.companyName
      ? `${roleLabel(peer.role)} · ${peer.companyName}`
      : roleLabel(peer.role)
    : '';

  const remoteHasLiveVideo = !!remoteStream?.getVideoTracks().some((track) => track.readyState === 'live');
  const localHasLiveVideo =
    !!localStream?.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled) &&
    (!isCameraOff || isSharingScreen);

  const statusText = (() => {
    if (phase === 'starting') return t('chat.call.calling');
    if (phase === 'ringing-outgoing') return t('chat.call.ringing');
    if (connectionStatus === 'connected') return t('chat.call.connected');
    if (connectionStatus === 'reconnecting') return t('chat.call.reconnecting');
    if (connectionStatus === 'failed') return t('chat.call.connectionFailed');
    return t('chat.call.connecting');
  })();

  const statusDotClass =
    connectionStatus === 'connected' && phase === 'ongoing'
      ? 'bg-emerald-400'
      : connectionStatus === 'failed'
        ? 'bg-rose-400'
        : 'bg-amber-400 animate-pulse';

  const warningText =
    mediaWarning === 'audio-only'
      ? t('chat.call.mediaAudioOnly')
      : mediaWarning === 'receive-only'
        ? t('chat.call.mediaReceiveOnly')
        : '';

  // Compact floating PiP bar when minimized
  if (minimized) {
    return (
      <aside
        aria-label={peerName}
        className={`fixed right-4 bottom-4 ${Z.modal} flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md sm:right-6 sm:bottom-6`}
      >
        {/* Keep remote audio playing while minimized */}
        <div className="sr-only">
          <StreamVideo stream={remoteStream} />
        </div>
        {peer ? (
          <span className="inline-flex rounded-full ring-2 ring-emerald-400/60">
            <Avatar id={peer.id} name={peer.fullName} size="md" />
          </span>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <Video aria-hidden className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="max-w-40 truncate text-sm font-semibold">{peerName}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-300 tabular-nums">
            <span aria-hidden className={`h-2 w-2 rounded-full ${statusDotClass}`} />
            {phase === 'ongoing' ? formatCallDuration(elapsed) : statusText}
          </p>
        </div>
        <div className="ml-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            disabled={!hasAudioTrack}
            aria-label={isMuted ? t('chat.call.unmuteMic') : t('chat.call.muteMic')}
            title={isMuted ? t('chat.call.unmuteMic') : t('chat.call.muteMic')}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isMuted ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff aria-hidden className="h-4 w-4" /> : <Mic aria-hidden className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMinimized(false)}
            aria-label={t('chat.call.expand')}
            title={t('chat.call.expand')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-800 text-slate-200 transition hover:bg-slate-700"
          >
            <Maximize2 aria-hidden className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onEndCall}
            disabled={ending}
            aria-label={phase === 'ringing-outgoing' ? t('chat.call.cancelCall') : t('chat.call.endCall')}
            title={phase === 'ringing-outgoing' ? t('chat.call.cancelCall') : t('chat.call.endCall')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-rose-600 text-white transition hover:bg-rose-500 disabled:opacity-60"
          >
            <PhoneOff aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${t('chat.call.startButton')} · ${peerName}`}
      className={`fixed inset-0 ${Z.modal} flex flex-col bg-[#070c18] text-slate-100`}
    >
      {/* Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0b1224]/95 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {peer ? (
            <Avatar id={peer.id} name={peer.fullName} size="md" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
              <Video aria-hidden className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">{peerName}</h2>
            {peerMeta && <p className="truncate text-xs text-slate-400">{peerMeta}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 text-xs font-medium text-slate-200">
            <span aria-hidden className={`h-2 w-2 rounded-full ${statusDotClass}`} />
            <span>{statusText}</span>
          </span>

          {phase === 'ongoing' && (
            <span className="rounded-full border border-slate-700/70 bg-slate-900/90 px-3 py-1 font-mono text-xs font-semibold text-slate-200 tabular-nums">
              {formatCallDuration(elapsed)}
            </span>
          )}

          {isSharingScreen && (
            <span className="hidden items-center gap-1.5 rounded-full bg-blue-600/20 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-500/40 sm:inline-flex">
              <Monitor aria-hidden className="h-3.5 w-3.5" />
              {t('chat.call.sharingScreenBadge')}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setMinimized(true);
              onOpenChat();
            }}
            aria-label={t('chat.call.openChat')}
            title={t('chat.call.openChat')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/80 text-slate-200 transition hover:bg-slate-800"
          >
            <MessageSquare aria-hidden className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label={t('chat.call.minimize')}
            title={t('chat.call.minimize')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/80 text-slate-200 transition hover:bg-slate-800"
          >
            <Minimize2 aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Video Stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-5">
        <div className="relative flex h-full w-full max-w-6xl items-center justify-center overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0d152a] shadow-2xl">
          {/* Remote Video */}
          <StreamVideo
            stream={remoteStream}
            className={`h-full w-full object-contain ${remoteHasLiveVideo && phase === 'ongoing' ? 'block' : 'hidden'}`}
          />

          {/* Remote Placeholder when ringing / connecting / remote camera off */}
          {(!remoteHasLiveVideo || phase !== 'ongoing') && (
            <div className="flex flex-col items-center justify-center gap-4 px-6 text-center">
              <div className="relative">
                {(phase === 'starting' || phase === 'ringing-outgoing') && (
                  <span
                    aria-hidden
                    className="absolute -inset-3 animate-ping rounded-full bg-brand/25"
                  />
                )}
                {peer ? (
                  <span className="relative inline-flex scale-150 rounded-full ring-2 ring-slate-700">
                    <Avatar id={peer.id} name={peer.fullName} size="md" />
                  </span>
                ) : (
                  <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-slate-300 ring-2 ring-slate-700">
                    <Video aria-hidden className="h-8 w-8" />
                  </span>
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-white">{peerName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {phase === 'ringing-outgoing' || phase === 'starting'
                    ? t('chat.call.waitingForPeer', { name: peerName })
                    : t('chat.call.waitingForVideo', { name: peerName })}
                </p>
              </div>
            </div>
          )}

          {/* Non-blocking warnings / errors */}
          {(warningText || error) && (
            <div className="absolute top-4 left-4 right-4 flex flex-col items-start gap-2 sm:right-auto sm:max-w-md">
              {warningText && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-950/85 px-3 py-2 text-xs text-amber-200 backdrop-blur-md">
                  <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-amber-400" />
                  <span>{warningText}</span>
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/40 bg-rose-950/90 px-3 py-2 text-xs text-rose-200 backdrop-blur-md"
                >
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Local PiP Preview */}
          <div className="absolute right-3 bottom-3 flex h-32 w-44 items-center justify-center overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/95 shadow-xl sm:right-5 sm:bottom-5 sm:h-40 sm:w-56">
            <StreamVideo
              stream={localStream}
              muted
              mirrored={!isSharingScreen}
              className={`h-full w-full object-cover ${localHasLiveVideo ? 'block' : 'hidden'}`}
            />
            {!localHasLiveVideo && (
              <div className="flex flex-col items-center gap-1 text-slate-400">
                <VideoOff aria-hidden className="h-5 w-5" />
                <span className="text-[11px] font-medium">{t('chat.call.cameraOff')}</span>
              </div>
            )}
            <span className="absolute bottom-2 left-2 rounded-md bg-slate-950/75 px-2 py-0.5 text-[11px] font-medium text-slate-200">
              {t('chat.call.you')}
              {isMuted ? ' · Muted' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Control Toolbar */}
      <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-slate-800/80 bg-[#0b1224]/95 px-4 py-4">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!hasAudioTrack}
          aria-label={isMuted ? t('chat.call.unmuteMic') : t('chat.call.muteMic')}
          title={isMuted ? t('chat.call.unmuteMic') : t('chat.call.muteMic')}
          className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isMuted
              ? 'border-rose-500/50 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
              : 'border-slate-700/70 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {isMuted ? <MicOff aria-hidden className="h-5 w-5" /> : <Mic aria-hidden className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onToggleCamera}
          disabled={!hasVideoTrack || isSharingScreen}
          aria-label={isCameraOff ? t('chat.call.turnOnCamera') : t('chat.call.turnOffCamera')}
          title={isCameraOff ? t('chat.call.turnOnCamera') : t('chat.call.turnOffCamera')}
          className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
            isCameraOff
              ? 'border-rose-500/50 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
              : 'border-slate-700/70 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {isCameraOff ? <VideoOff aria-hidden className="h-5 w-5" /> : <Video aria-hidden className="h-5 w-5" />}
        </button>

        {phase === 'ongoing' && (
          <button
            type="button"
            onClick={onToggleScreenShare}
            aria-label={isSharingScreen ? t('chat.call.stopSharing') : t('chat.call.shareScreen')}
            title={isSharingScreen ? t('chat.call.stopSharing') : t('chat.call.shareScreen')}
            className={`flex h-12 w-12 cursor-pointer items-center justify-center rounded-2xl border transition ${
              isSharingScreen
                ? 'border-blue-400 bg-blue-600 text-white hover:bg-blue-500'
                : 'border-slate-700/70 bg-slate-800/90 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {isSharingScreen ? <MonitorOff aria-hidden className="h-5 w-5" /> : <Monitor aria-hidden className="h-5 w-5" />}
          </button>
        )}

        <button
          type="button"
          onClick={onEndCall}
          disabled={ending}
          className="ml-2 inline-flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-wait disabled:opacity-60"
        >
          {ending ? (
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
          ) : (
            <PhoneOff aria-hidden className="h-5 w-5" />
          )}
          <span>
            {ending
              ? t('chat.call.ending')
              : phase === 'ringing-outgoing' || phase === 'starting'
                ? t('chat.call.cancelCall')
                : t('chat.call.endCall')}
          </span>
        </button>
      </footer>
    </div>
  );
}
