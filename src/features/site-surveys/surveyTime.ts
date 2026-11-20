import { formatDateTime, formatTime } from '@/i18n';
import type { TimeSlot } from './siteSurveyApi';

/**
 * Time slot helpers. The date and time inputs are always Vietnam time (Asia/Ho_Chi_Minh, UTC+7, no daylight saving),
 * whatever the browser's time zone, so they match how times are shown. The API takes ISO 8601 (sent in UTC).
 */

export interface SlotForm { date: string; from: string; to: string }

const VN_OFFSET = '+07:00';
const vnParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const vn = (d: Date) => {
  const p = Object.fromEntries(vnParts.formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
};

/** YYYY-MM-DD of `d` in Vietnam (for the date input's min). */
export const vnDate = (d: Date) => vn(d).date;

export const toSlotForm = (slot: TimeSlot): SlotForm => {
  const s = vn(new Date(slot.startAt)), e = vn(new Date(slot.endAt));
  return { date: s.date, from: s.time, to: e.time };
};
const toIso = (date: string, time: string) => new Date(`${date}T${time}:00${VN_OFFSET}`).toISOString();
export const toSlot = (f: SlotForm): TimeSlot => ({ startAt: toIso(f.date, f.from), endAt: toIso(f.date, f.to) });
export const blankSlot = (): SlotForm => ({ date: '', from: '09:00', to: '11:00' });
export const sameSlots = (a: TimeSlot[], b: TimeSlot[]) =>
  a.length === b.length && a.every((s, i) => new Date(s.startAt).getTime() === new Date(b[i].startAt).getTime() && new Date(s.endAt).getTime() === new Date(b[i].endAt).getTime());

/** "Nov 21, 2026, 9:00 AM – 11:00 AM" (Vietnam time) */
export const slotLabel = (slot: TimeSlot) => `${formatDateTime(slot.startAt)} – ${formatTime(slot.endAt)}`;
/** Compares instants, so it holds in any time zone. */
export const isPast = (slot: TimeSlot) => new Date(slot.startAt).getTime() <= Date.now();
