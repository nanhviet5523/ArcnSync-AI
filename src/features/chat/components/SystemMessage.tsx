import type { ChatMessageSummary } from '@/types/chat';
import { clock } from '../chatFormat';

/** SYSTEM message (e.g. a video call result): small centred line, no bubble, no "You". */
export function SystemMessage({ message: m }: { message: ChatMessageSummary }) {
  return (
    <p className="mx-auto max-w-[85%] text-center text-xs text-slate-500">
      <span className="whitespace-pre-wrap break-words italic">{m.content}</span>
      <time dateTime={m.createdAt} className="ml-1.5 text-[11px] text-subtext">{clock(m.createdAt)}</time>
    </p>
  );
}
