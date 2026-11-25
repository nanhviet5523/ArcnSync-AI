import { createContext, useContext } from 'react';
import type { ConversationItem, VideoCallItem } from '@/types/chat';
import type { VideoCallPhase } from './videoCallState';

export interface StartCallResult {
  ok: boolean;
  error?: string;
  blocked?: boolean;
  notFound?: boolean;
}

export interface VideoCallContextValue {
  phase: VideoCallPhase;
  activeCall: VideoCallItem | null;
  startCall: (conversation: ConversationItem) => Promise<StartCallResult>;
}

export const VideoCallContext = createContext<VideoCallContextValue>({
  phase: 'idle',
  activeCall: null,
  startCall: async () => ({ ok: false }),
});

export function useVideoCall(): VideoCallContextValue {
  return useContext(VideoCallContext);
}
