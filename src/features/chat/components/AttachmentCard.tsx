import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { t } from '@/i18n';
import { downloadFile, fetchBlobUrl, revokeBlobUrl } from '@/services/authService';
import type { ChatAttachment } from '@/types/chat';
import { formatBytes } from '../chatFormat';

const PREVIEWABLE = new Set(['image/png', 'image/jpeg', 'image/webp']);
/** Same box for the loading placeholder, the image and the error: h-48 whatever happens. */
const PREVIEW_FRAME = 'h-48 w-full bg-slate-100';

/**
 * A file sent in chat. `attachment.url` needs the Bearer token, so it never goes into href/src: the preview is a blob
 * URL from fetchBlobUrl (revoked on unmount) and the download goes through downloadFile.
 */
export function AttachmentCard({ attachment, mine }: { attachment: ChatAttachment; mine: boolean }) {
  const { name, mimeType, sizeBytes, url } = attachment;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const size = formatBytes(sizeBytes);

  const download = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadFile(url, name, { preferFallbackName: true });
    } catch {
      setDownloadError(t('chat.thread.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={`w-64 max-w-full overflow-hidden rounded-xl border ${mine ? 'border-white/30 bg-white/10' : 'border-line bg-surface'}`}>
      {PREVIEWABLE.has(mimeType) && <ImagePreview path={url} alt={name} />}
      <div className="flex items-center gap-2.5 p-2.5">
        <FileText aria-hidden className="h-5 w-5 shrink-0 opacity-80" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={name}>{name}</p>
          {size && <p className={`text-xs ${mine ? 'text-white/80' : 'text-slate-500'}`}>{size}</p>}
        </div>
        <button
          type="button"
          onClick={() => void download()}
          disabled={downloading}
          aria-label={t('chat.thread.download', { name })}
          className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-60 ${mine ? 'hover:bg-white/15' : 'hover:bg-slate-100'}`}
        >
          {downloading
            ? <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            : <Download aria-hidden className="h-4 w-4" />}
        </button>
      </div>
      {downloadError && <p role="alert" className={`px-2.5 pb-2 text-xs ${mine ? 'text-white' : 'text-rose-700'}`}>{downloadError}</p>}
    </div>
  );
}

function ImagePreview({ path, alt }: { path: string; alt: string }) {
  const [src, setSrc] = useState<{ path: string; url: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchBlobUrl(path).then(
      (url) => { if (live) setSrc({ path, url }); },
      () => { if (live) setFailed(path); },
    );
    return () => {
      live = false;
      revokeBlobUrl(path);
    };
  }, [path]);

  // Placeholder, image and error share one fixed-height frame: the thread never shifts when the image arrives.
  if (failed === path) {
    return <p className={`${PREVIEW_FRAME} flex items-center justify-center px-2.5 text-xs text-slate-500`}>{t('chat.thread.previewFailed')}</p>;
  }
  if (src?.path !== path) return <div aria-hidden className={`${PREVIEW_FRAME} animate-pulse`} />;
  return <img src={src.url} alt={alt} className={`${PREVIEW_FRAME} block object-contain`} />;
}
