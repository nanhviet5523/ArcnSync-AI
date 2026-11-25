// No '@/' runtime imports here: videoCallState.test.ts loads this file with plain `node --test`.
import type { ConversationItem, VideoCallItem, VideoCallStatus } from '../../types/chat.ts';

export type VideoCallPhase =
  | 'idle'
  | 'starting'
  | 'ringing-outgoing'
  | 'ringing-incoming'
  | 'connecting'
  | 'ongoing';

const ACTIVE_STATUSES: ReadonlySet<VideoCallStatus> = new Set(['RINGING', 'ONGOING']);
const TERMINAL_STATUSES: ReadonlySet<VideoCallStatus> = new Set([
  'ENDED',
  'DECLINED',
  'MISSED',
  'CANCELLED',
]);

export const isActiveCallStatus = (status: VideoCallStatus): boolean => ACTIVE_STATUSES.has(status);
export const isTerminalCallStatus = (status: VideoCallStatus): boolean => TERMINAL_STATUSES.has(status);

/** Can the viewer initiate a new video call in this conversation right now? */
export function canStartCallInConversation(
  conversation: Pick<ConversationItem, 'canSend'>,
  phase: VideoCallPhase,
): boolean {
  return conversation.canSend && phase === 'idle';
}

/** Return the peer user ID in a 1-1 call. */
export function resolvePeerUserId(call: Pick<VideoCallItem, 'callerId' | 'calleeId'>, meId: string): string {
  return call.callerId === meId ? call.calleeId : call.callerId;
}

/** Format duration in seconds as MM:SS (or H:MM:SS for calls >= 1 hour). */
export function formatCallDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Elapsed seconds since `answeredAt`, clamped to >= 0. */
export function elapsedSecondsSince(answeredAt: string | null, nowMs: number): number {
  if (!answeredAt) return 0;
  const startedMs = Date.parse(answeredAt);
  if (Number.isNaN(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
}

/**
 * Guard against out-of-order or stale call socket events:
 * - A terminal event for an unrelated call ID is ignored.
 * - An event that tries to move the current call backwards (e.g. ONGOING → RINGING, or terminal → active) is ignored.
 */
export function shouldIgnoreCallEvent(
  currentCall: VideoCallItem | null,
  incoming: VideoCallItem,
): boolean {
  if (!currentCall) {
    // Only a RINGING incoming call can bootstrap a brand-new call UI from idle.
    return incoming.status !== 'RINGING';
  }
  if (currentCall.id !== incoming.id) {
    // Ignore stale updates for a previous call while another call is active.
    return isActiveCallStatus(currentCall.status);
  }
  if (isTerminalCallStatus(currentCall.status)) {
    return true;
  }
  if (currentCall.status === 'ONGOING' && incoming.status === 'RINGING') {
    return true;
  }
  return false;
}

/** i18n key + optional interpolation params for the post-call summary banner. */
export function callEndBanner(
  call: Pick<VideoCallItem, 'status' | 'durationSeconds'>,
  isCaller: boolean,
  peerName: string,
): { key: string; vars?: Record<string, string | number> } {
  switch (call.status) {
    case 'ENDED':
      return {
        key: 'chat.call.endedNormal',
        vars: { duration: formatCallDuration(call.durationSeconds) },
      };
    case 'DECLINED':
      return isCaller
        ? { key: 'chat.call.endedDeclinedByPeer', vars: { name: peerName } }
        : { key: 'chat.call.endedDeclined' };
    case 'CANCELLED':
      return { key: 'chat.call.endedCancelled' };
    case 'MISSED':
    default:
      return { key: 'chat.call.endedMissed' };
  }
}
