import { useEffect, useState } from 'react';
import { Download, Expand, FileText, RotateCw, X } from 'lucide-react';
import { Z } from '@/components/ui/zIndex';
import { t } from '@/i18n';
import type { ChatAttachment } from '@/types/chat';
import { attachmentBadgeLabel, isPreviewableImageMime } from '../attachmentUtils';
import { chatApi } from '../chatApi';
import { attachmentFailure } from '../chatErrors';
import { formatBytes } from '../chatFormat';

/** Same box for the loading placeholder, the image and the error: h-48 whatever happens. */
const PREVIEW_FRAME = 'h-48 w-full bg-slate-100';

/**
 * A file sent in chat (`GET /messages/:id/attachment`, behind Bearer auth).
 * - Inline preview (PNG/JPEG/WebP) uses a component-owned blob URL with AbortController cleanup + Lightbox view.
 * - Downloads use `chatApi.fetchAttachment`, preserving backend error codes (MESSAGE_NOT_FOUND, CHAT_ATTACHMENT_NOT_FOUND).
 */
export function AttachmentCard({
  messageId,
  attachment,
  mine,
}: {
  messageId: string;
  attachment: ChatAttachment;
  mine: boolean;
}) {
  const { name, mimeType, sizeBytes, url } = attachment;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<{ message: string; retryable: boolean } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const size = formatBytes(sizeBytes);
  const badge = attachmentBadgeLabel(name, mimeType);
  const previewable = isPreviewableImageMime(mimeType);

  const download = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const { blob, fileName } = await chatApi.fetchAttachment(messageId, url);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name || fileName || 'attachment';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      const failure = attachmentFailure(error);
      setDownloadError({ message: t(failure.messageKey), retryable: failure.retryable });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div
        className={`w-64 max-w-full overflow-hidden rounded-xl border ${
          mine ? 'border-white/30 bg-white/10' : 'border-line bg-surface'
        }`}
      >
        {previewable && (
          <ImagePreview
            messageId={messageId}
            attachmentUrl={url}
            alt={name}
            onOpenLightbox={setLightboxSrc}
          />
        )}
        <div className="flex items-center gap-2.5 p-2.5">
          {previewable ? (
            <FileText aria-hidden className="h-5 w-5 shrink-0 opacity-80" />
          ) : (
            <span
              className={`flex h-8 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold tracking-wide ${
                mine ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {badge}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={name}>
              {name}
            </p>
            {size && (
              <p className={`text-xs ${mine ? 'text-white/80' : 'text-slate-500'}`}>{size}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloading}
            aria-label={t('chat.thread.download', { name })}
            title={t('chat.thread.download', { name })}
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 ${
              mine ? 'hover:bg-white/15' : 'hover:bg-slate-100'
            }`}
          >
            {downloading ? (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
            ) : (
              <Download aria-hidden className="h-4 w-4" />
            )}
          </button>
        </div>
        {downloadError && (
          <div
            role="alert"
            className={`flex items-center justify-between gap-2 px-2.5 pb-2 text-xs ${
              mine ? 'text-white' : 'text-rose-700'
            }`}
          >
            <span>{downloadError.message}</span>
            {downloadError.retryable && (
              <button
                type="button"
                onClick={() => void download()}
                className="shrink-0 cursor-pointer font-semibold underline"
              >
                {t('common.retry')}
              </button>
            )}
          </div>
        )}
      </div>

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          name={name}
          size={size}
          downloading={downloading}
          onDownload={() => void download()}
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </>
  );
}

function ImagePreview({
  messageId,
  attachmentUrl,
  alt,
  onOpenLightbox,
}: {
  messageId: string;
  attachmentUrl: string;
  alt: string;
  onOpenLightbox: (src: string) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    | { key: string; status: 'ready'; url: string }
    | { key: string; status: 'error'; message: string; retryable: boolean }
    | null
  >(null);

  const key = `${messageId}:${attachmentUrl}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    let createdUrl: string | null = null;

    chatApi.fetchAttachment(messageId, attachmentUrl, { signal: controller.signal }).then(
      ({ blob }) => {
        if (controller.signal.aborted) return;
        createdUrl = URL.createObjectURL(blob);
        setState({ key, status: 'ready', url: createdUrl });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = attachmentFailure(error);
        setState({
          key,
          status: 'error',
          message: failure.code ? t(failure.messageKey) : t('chat.thread.previewFailed'),
          retryable: failure.retryable,
        });
      },
    );

    return () => {
      controller.abort();
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [key, messageId, attachmentUrl]);

  // Placeholder, image and error share one fixed-height frame: the thread never shifts when the image arrives.
  if (state?.key === key && state.status === 'error') {
    return (
      <div className={`${PREVIEW_FRAME} flex flex-col items-center justify-center gap-2 px-3 text-center text-xs text-slate-500`}>
        <span>{state.message}</span>
        {state.retryable && (
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <RotateCw aria-hidden className="h-3 w-3" />
            {t('common.retry')}
          </button>
        )}
      </div>
    );
  }
  if (state?.key !== key || state.status !== 'ready') {
    return <div aria-hidden className={`${PREVIEW_FRAME} animate-pulse`} />;
  }
  return (
    <button
      type="button"
      onClick={() => onOpenLightbox(state.url)}
      aria-label={t('chat.thread.openPreview', { name: alt })}
      className="group relative block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      <img src={state.url} alt={alt} className={`${PREVIEW_FRAME} block object-contain`} />
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 bottom-2 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/65 text-white opacity-0 transition group-hover:opacity-100"
      >
        <Expand className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

function ImageLightbox({
  src,
  name,
  size,
  downloading,
  onDownload,
  onClose,
}: {
  src: string;
  name: string;
  size: string;
  downloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      onClick={onClose}
      className={`fixed inset-0 ${Z.modal} flex flex-col bg-slate-950/90 p-4 backdrop-blur-xs sm:p-6`}
    >
      <div
        className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 pb-3 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          {size && <p className="text-xs text-slate-400">{size}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
          >
            <Download aria-hidden className="h-4 w-4" />
            {t('chat.thread.download', { name: '' }).trim()}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt={name}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
