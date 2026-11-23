import type { ChatMessageSummary } from '@/types/chat';
import { clock } from '../chatFormat';
import { AttachmentCard } from './AttachmentCard';

/**
 * A TEXT or FILE message. `mine` comes from senderId (sender may be null). Text is rendered as plain text
 * (React escapes it); line breaks are kept with whitespace-pre-wrap.
 */
export function MessageBubble({ message: m, mine }: { message: ChatMessageSummary; mine: boolean }) {
  // For a FILE the content is usually the file name; show it only when it says something more.
  const text = m.messageType === 'FILE' && m.content === m.attachment?.name ? '' : m.content;

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
        {m.project && (
          <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {m.project.code} · {m.project.title}
          </span>
        )}
        <div className={`flex flex-col gap-2 rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-slate-100 text-slate-900'}`}>
          {m.messageType === 'FILE' && m.attachment && <AttachmentCard attachment={m.attachment} mine={mine} />}
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        </div>
        <time dateTime={m.createdAt} className="px-1 text-[11px] text-slate-500">{clock(m.createdAt)}</time>
      </div>
    </div>
  );
}
