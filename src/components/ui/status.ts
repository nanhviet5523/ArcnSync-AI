import { t } from '../../i18n/index.ts';

/**
 * Chip colours. One fixed colour per step, shared by every page:
 * Concept light blue, Layout blue, Products violet, Quotation orange, In review yellow,
 * Approved/Completed green, Cancelled light red, "Needs my action" yellow-orange (amber).
 * gray = not started, struck = superseded.
 */
export type Tone = 'gray' | 'sky' | 'blue' | 'violet' | 'orange' | 'yellow' | 'amber' | 'green' | 'red' | 'struck';

export const TONE_CLASS: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100',
  violet: 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-100',
  orange: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-100',
  yellow: 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100',
  red: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100',
  struck: 'bg-slate-50 text-slate-500 line-through',
};

/** The one map from backend enums to label + tone. */
const STATUS: Record<string, Record<string, Tone>> = {
  project: {
    DRAFT: 'gray', CONTRACT_PENDING: 'yellow', REQUIREMENT_ANALYSIS: 'gray', IN_DESIGN: 'blue',
    PRODUCT_SELECTION: 'violet', QUOTING: 'orange', COMPLETED: 'green', CANCELLED: 'red',
  },
  version: { DRAFT: 'gray', SUBMITTED: 'yellow', REVISION_REQUESTED: 'blue', APPROVED: 'green', SUPERSEDED: 'struck' },
  comment: { OPEN: 'amber', ADDRESSED: 'blue', RESOLVED: 'green' },
  choice: { CHOSEN: 'green', NOT_CHOSEN: 'amber', UNIDENTIFIED: 'gray' },
  stage: { CONCEPT: 'sky', LAYOUT_2D: 'blue', RENDER_3D: 'violet' },
  flag: { NEEDS_ME: 'amber' },
  projectRole: { LEAD: 'blue', MEMBER: 'gray' },
  roomDraft: { DRAFT: 'gray', READY: 'green' },
};
export type StatusKind = 'project' | 'version' | 'comment' | 'choice' | 'stage' | 'flag' | 'projectRole' | 'roomDraft';

export const statusInfo = (kind: StatusKind, value: string) => ({
  label: t(`status.${kind}.${value}`),
  tone: STATUS[kind]?.[value] ?? 'gray',
});

/** Avatar colours of the designer in charge of a room, picked by designer id. Dark enough for white letters; no violet, which is the Products chip. */
export const AVATAR_TONES = [
  'bg-navy text-white', 'bg-blue-700 text-white', 'bg-emerald-700 text-white',
  'bg-amber-700 text-white', 'bg-rose-700 text-white', 'bg-cyan-700 text-white',
] as const;

export function avatarTone(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]?.toUpperCase()).slice(0, 2).join('');

/** Letters per person id. People with the same initials are numbered in list order: DD, DD2. */
export function avatarLabels(people: readonly { id: string; name: string }[]): Record<string, string> {
  const out: Record<string, string> = {}, seen: Record<string, number> = {};
  for (const p of people) {
    if (out[p.id]) continue;
    const base = initials(p.name);
    seen[base] = (seen[base] ?? 0) + 1;
    out[p.id] = seen[base] > 1 ? `${base}${seen[base]}` : base;
  }
  return out;
}

const ROLE_ALIAS: Record<string, string> = { CUSTOMER: 'homeowner', HOMEOWNER: 'homeowner', STAFF: 'staff', DESIGNER: 'designer', SUPPLIER: 'supplier', ADMIN: 'admin' };
/** CUSTOMER (backend) and homeowner (frontend) both read "Homeowner". */
export const roleLabel = (role: string) => t(`role.${ROLE_ALIAS[role] ?? role}`);
