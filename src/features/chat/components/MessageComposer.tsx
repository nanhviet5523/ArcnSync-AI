import { useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Lock, Paperclip, SendHorizontal, X } from 'lucide-react';
import { t } from '@/i18n';
import type { ConversationItem } from '@/types/chat';
import { formatBytes } from '../chatFormat';
import { useSendMessage } from '../hooks/useSendMessage';
import type { SendCallbacks } from '../hooks/useSendMessage';
import {
  CHAT_FILE_ACCEPT,
  COUNTER_FROM,
  MAX_MESSAGE_LENGTH,
  canSubmit,
  contentLength,
  validateChatFile,
} from '../sendMessage';

/** About 6 lines of text-sm (20px) plus padding. */
const MAX_TEXTAREA_PX = 6 * 20 + 16;

/**
 * Text, one optional file, one optional shared project. Enter sends, Shift+Enter breaks the line, and Enter that
 * confirms a Vietnamese IME word (Telex/VNI) never sends. The draft is cleared only after the 201.
 * Mount it with key={conversation.id} so a draft never follows you to another conversation.
 */
export function MessageComposer({ conversation, callbacks }: { conversation: ConversationItem; callbacks: SendCallbacks }) {
  const { send, sending, progress, error, reset } = useSendMessage(conversation.id, callbacks);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState('');
  const [fileProblem, setFileProblem] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Grow with the text, up to ~6 lines, then scroll inside.
  useLayoutEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_PX)}px`;
  }, [text]);

  const length = contentLength(text);
  const tooLong = length > MAX_MESSAGE_LENGTH;
  const ready = canSubmit(text, file) && !sending;

  const submit = async () => {
    if (!ready) return;
    const result = await send({ content: text, file, projectId: projectId || null });
    if (result.ok) {
      setText('');
      setFile(null);
      setProjectId('');
      setFileProblem('');
      textarea.current?.focus();
    } else if (result.effect === 'dropFile') {
      setFile(null);
    } else if (result.effect === 'dropContext') {
      setProjectId('');
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    // The IME uses Enter to confirm a word: that Enter must not send.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    void submit();
  };

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = ''; // picking the same file again still fires change
    if (!picked) return;
    const problem = validateChatFile(picked);
    if (problem) {
      setFileProblem(t(problem === 'FILE_TOO_LARGE' ? 'chat.composer.fileTooLarge' : 'chat.composer.fileType'));
      return;
    }
    setFileProblem('');
    reset();
    setFile(picked);
  };

  if (!conversation.canSend) {
    return (
      <div className="border-t border-line px-4 py-2.5">
        {error && <p role="alert" className="mb-1.5 text-center text-xs text-rose-700">{error}</p>}
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock aria-hidden className="h-3.5 w-3.5 shrink-0" />{t('chat.conversations.readOnlyHint')}
        </p>
      </div>
    );
  }

  const shownError = fileProblem || error;
  return (
    <form
      className="space-y-2 border-t border-line px-3 py-2.5"
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      aria-busy={sending}
    >
      {shownError && (
        <div role="alert" className="flex items-start justify-between gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span>{shownError}</span>
          <button type="button" onClick={() => { setFileProblem(''); reset(); }} aria-label={t('common.close')} className="cursor-pointer rounded p-0.5 hover:bg-rose-100">
            <X aria-hidden className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {(file || conversation.sharedProjects.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {file && (
            <span className="flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 py-1 pr-1 pl-2.5 text-xs text-slate-700">
              <Paperclip aria-hidden className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-48 truncate font-medium" title={file.name}>{file.name}</span>
              <span className="text-slate-500">{formatBytes(String(file.size))}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                disabled={sending}
                aria-label={t('chat.composer.removeFile', { name: file.name })}
                className="cursor-pointer rounded-full p-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X aria-hidden className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {conversation.sharedProjects.length > 0 && (
            <label className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
              <span className="shrink-0">{t('chat.composer.project')}</span>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={sending}
                className="min-w-0 max-w-56 truncate rounded-lg border border-line bg-surface px-2 py-1 text-xs text-slate-800 disabled:opacity-50"
              >
                <option value="">{t('chat.composer.noProject')}</option>
                {conversation.sharedProjects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {sending && progress !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={t('chat.composer.uploading')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full bg-brand transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileInput} type="file" accept={CHAT_FILE_ACCEPT} onChange={onPickFile} className="hidden" tabIndex={-1} />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={sending}
          aria-label={t('chat.composer.attach')}
          title={t('chat.composer.attach')}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Paperclip aria-hidden className="h-5 w-5" />
        </button>
        <textarea
          ref={textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          readOnly={sending}
          rows={1}
          placeholder={t('chat.composer.placeholder')}
          aria-label={t('chat.composer.label')}
          aria-invalid={tooLong || undefined}
          className="min-h-9 flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm leading-5 text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-brand read-only:opacity-70"
        />
        <button
          type="submit"
          disabled={!ready}
          aria-label={t('chat.composer.send')}
          title={t('chat.composer.send')}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-brand text-white hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending
            ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            : <SendHorizontal aria-hidden className="h-4 w-4" />}
        </button>
      </div>

      {length > COUNTER_FROM && (
        <p className={`text-right text-[11px] tabular-nums ${tooLong ? 'font-semibold text-rose-700' : 'text-slate-500'}`} aria-live="polite">
          {t('chat.composer.counter', { n: length, max: MAX_MESSAGE_LENGTH })}
        </p>
      )}
    </form>
  );
}
