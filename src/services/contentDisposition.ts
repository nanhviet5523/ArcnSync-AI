// No imports on purpose: authService, chat and contracts all use this, and plain `node --test` can load it.

/**
 * File name from a Content-Disposition header, or null when there is none.
 * Prefers RFC 5987 `filename*=UTF-8''…` (percent-encoded, so Vietnamese names survive) over plain `filename="…"`.
 * The browser can read this header from another origin only when the backend lists it in CORS `exposedHeaders`.
 */
export function parseContentDispositionFileName(header: string | null | undefined): string | null {
  if (!header) return null;

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

  // `filename` not followed by `*`, so `filename*=…` in another charset is never read as a plain name.
  const plainMatch = /filename(?!\*)\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(header);
  const candidate = (plainMatch?.[1] ?? plainMatch?.[2] ?? '').trim();
  return candidate || null;
}
