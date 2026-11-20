import { formatDateTime, formatTime } from '@/i18n';
import type { TimeSlot } from './siteSurveyApi';

/** Time slot helpers. Date and time inputs use the browser's local time; the API takes ISO 8601 (sent in UTC). */

export interface SlotForm { date: string; from: string; to: string }

const pad = (n: number) => String(n).padStart(2, '0');
export const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const toSlotForm = (slot: TimeSlot): SlotForm => {
  const s = new Date(slot.startAt), e = new Date(slot.endAt);
  return { date: localDate(s), from: localTime(s), to: localTime(e) };
};
const toIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
export const toSlot = (f: SlotForm): TimeSlot => ({ startAt: toIso(f.date, f.from), endAt: toIso(f.date, f.to) });
export const blankSlot = (): SlotForm => ({ date: '', from: '09:00', to: '11:00' });
export const sameSlots = (a: TimeSlot[], b: TimeSlot[]) =>
  a.length === b.length && a.every((s, i) => new Date(s.startAt).getTime() === new Date(b[i].startAt).getTime() && new Date(s.endAt).getTime() === new Date(b[i].endAt).getTime());

/** "Nov 21, 2026, 9:00 AM – 11:00 AM" */
export const slotLabel = (slot: TimeSlot) => `${formatDateTime(slot.startAt)} – ${formatTime(slot.endAt)}`;
export const isPast = (slot: TimeSlot) => new Date(slot.startAt).getTime() <= Date.now();
