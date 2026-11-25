// No '@/' runtime imports here: chatFormat can be loaded with plain `node --test`.

/** Chat times are shown in Vietnam time, like the rest of the app. */
const ZONE = 'Asia/Ho_Chi_Minh';
const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, timeStyle: 'short' });
const monthDayFmt = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, month: 'short', day: 'numeric' });
const fullDateFmt = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, dateStyle: 'medium' });
const weekdayDateFmt = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-24" in Vietnam time: groups messages by day. */
export const dayKey = (iso: string | Date): string => dayKeyFmt.format(new Date(iso));

/** "10:24 AM". */
export const clock = (iso: string): string => clockFmt.format(new Date(iso));

/** Conversation list: "10:24 AM" today, "Nov 20" this year, "Dec 3, 2025" before that. */
export function stamp(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(now)) return clockFmt.format(d);
  return dayKey(d).slice(0, 4) === dayKey(now).slice(0, 4) ? monthDayFmt.format(d) : fullDateFmt.format(d);
}

/** Day divider in a thread: 'today', 'yesterday' (the caller translates them) or "Monday, Nov 23, 2026". */
export function dayDivider(iso: string, now = new Date()): 'today' | 'yesterday' | string {
  const key = dayKey(iso);
  if (key === dayKey(now)) return 'today';
  if (key === dayKey(new Date(now.getTime() - DAY_MS))) return 'yesterday';
  return weekdayDateFmt.format(new Date(iso));
}

/** sizeBytes is a BIGINT string: "1536" → "1.5 KB". '' when it is not a number. */
export function formatBytes(sizeBytes: string): string {
  const n = Number(sizeBytes);
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace(/\.0$/, '')} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace(/\.0$/, '')} MB`;
}
