// No '@/' runtime imports here: attachmentUtils.test.ts loads this file with plain `node --test`.

const PREVIEWABLE_IMAGE_MIMES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

/** Only accept relative backend chat attachment paths so Bearer tokens are never sent elsewhere. */
const SAFE_ATTACHMENT_PATH = /^\/messages\/[^/?#]+\/attachment$/;

/** Build the authenticated GET /messages/:id/attachment path (falls back to safe attachment.url if provided). */
export function resolveAttachmentPath(messageId: string, attachmentUrl?: string): string {
  if (attachmentUrl && SAFE_ATTACHMENT_PATH.test(attachmentUrl)) {
    return attachmentUrl;
  }
  return `/messages/${encodeURIComponent(messageId)}/attachment`;
}

/** True for image formats safe to preview inline via blob URL. */
export function isPreviewableImageMime(mimeType: string): boolean {
  return PREVIEWABLE_IMAGE_MIMES.has(mimeType.toLowerCase());
}

/** Shared with the other downloads; re-exported here for the chat code and its tests. */
export { parseContentDispositionFileName } from '../../services/contentDisposition.ts';

/** Short human badge label for non-image files (PDF, DOCX, XLSX, DXF, ZIP, FILE). */
export function attachmentBadgeLabel(name: string, mimeType: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toUpperCase();
  if (ext && ['PDF', 'DOCX', 'XLSX', 'DXF', 'ZIP', 'PNG', 'JPG', 'JPEG', 'WEBP'].includes(ext)) {
    return ext === 'JPEG' ? 'JPG' : ext;
  }
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'application/zip') return 'ZIP';
  if (mimeType === 'application/dxf') return 'DXF';
  return 'FILE';
}
