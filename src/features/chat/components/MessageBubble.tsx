import { CheckCheck } from 'lucide-react';
import { t } from '@/i18n';
import type { ChatMessageSummary } from '@/types/chat';
import { clock } from '../chatFormat';
import { AttachmentCard } from './AttachmentCard';

/**
 * A TEXT or FILE message. `mine` comes from senderId (sender may be null). Text is rendered as plain text
 * (React escapes it); line breaks are kept with whitespace-pre-wrap.
 */
export function MessageBubble({
  message: m,
  mine,
  seenAt,
}: {
  message: ChatMessageSummary;
  mine: boolean;
  /** When set (on the last outgoing message covered by otherLastReadAt), renders a "Seen" receipt. */
  seenAt?: string | null;
}) {
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
        <div
          className={`flex flex-col gap-2 rounded-2xl px-3.5 py-2 text-sm ${
            mine
              ? 'rounded-br-md bg-brand text-[#FBF8EF]'
              : 'rounded-bl-md bg-slate-100 text-ink'
          }`}
        >
          {m.messageType === 'FILE' && m.attachment && (
            <AttachmentCard messageId={m.id} attachment={m.attachment} mine={mine} />
          )}
          {text && <p className="whitespace-pre-wrap break-words">{text}</p>}
        </div>
        <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500">
          <time dateTime={m.createdAt}>{clock(m.createdAt)}</time>
          {mine && seenAt && (
            <span
              className="inline-flex items-center gap-0.5 font-medium text-brand"
              title={t('chat.thread.seenAt', { time: clock(seenAt) })}
            >
              <CheckCheck aria-hidden className="h-3.5 w-3.5" />
              <span>{t('chat.thread.seen')}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
