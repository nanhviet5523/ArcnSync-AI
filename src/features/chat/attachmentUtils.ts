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

/**
 * Extract filename from Content-Disposition. Supports RFC 5987 `filename*=UTF-8''...` (sent by backend
 * ChatController.attachment) and plain `filename="..."`, returning null when missing or unreadable.
 */
export function parseContentDispositionFileName(header: string | null): string | null {
  if (!header) return null;

  // Prefer RFC 5987 UTF-8 encoded filename*
  const utf8Match = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    const raw = utf8Match[1].trim().replace(/^"|"$/g, '');
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded) return decoded;
    } catch {
      if (raw) return raw;
    }
  }

  // Fallback to standard filename="..." or filename=...
  const plainMatch = /filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(header);
  const candidate = (plainMatch?.[1] ?? plainMatch?.[2] ?? '').trim();
  return candidate || null;
}

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
